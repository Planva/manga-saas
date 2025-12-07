import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

import { getDB } from "@/db";
import { eq } from "drizzle-orm";
import { userTable, stripeCustomerMapTable } from "@/db/schema";
import { updateUserCredits } from "@/utils/credits";
import { getPriceToCreditsMap } from "@/config/price-to-credits";
import { getSystemSettings } from "@/utils/system-settings";
import { logUserEvent } from "@/utils/user-events";

async function setUnlimitedUntil(userId: string, untilUnixSec: number) {
  const db = getDB();
  await db
    .update(userTable)
    .set({ unlimitedUsageUntil: untilUnixSec, updatedAt: new Date() })
    .where(eq(userTable.id, userId));
}

async function ensureStripeCustomerMap(userId: string, customerId?: string | null) {
  if (!customerId) return;
  const db = getDB();

  const exists = await db
    .select({ userId: stripeCustomerMapTable.userId })
    .from(stripeCustomerMapTable)
    .where(eq(stripeCustomerMapTable.customerId, customerId))
    .get();

  if (!exists) {
    await db.insert(stripeCustomerMapTable).values({
      customerId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function getUserIdByCustomer(customerId?: string | null): Promise<string | undefined> {
  if (!customerId) return undefined;
  const db = getDB();
  const row = await db
    .select({ userId: stripeCustomerMapTable.userId })
    .from(stripeCustomerMapTable)
    .where(eq(stripeCustomerMapTable.customerId, customerId))
    .get();
  return row?.userId;
}

async function getUserIdByEmail(email?: string | null): Promise<string | undefined> {
  if (!email) return undefined;
  const db = getDB();
  const row = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .get();
  return row?.id;
}

function unlimitedEnabledFor(priceId: string | undefined, settings: Awaited<ReturnType<typeof getSystemSettings>>) {
  if (!priceId) return false;

  const mode = settings.subsUnlimitedMode;
  const monthly = settings.stripePrices.subMonthly;
  const yearly = settings.stripePrices.subYearly;

  if (mode === "off") return false;
  if (mode === "all") {
    return Boolean((monthly && priceId === monthly) || (yearly && priceId === yearly));
  }
  if (mode === "monthly") {
    return Boolean(monthly && priceId === monthly);
  }
  if (mode === "yearly") {
    return Boolean(yearly && priceId === yearly);
  }
  return false;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET missing");
    return new Response("Webhook secret missing", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature") || "";

  // 使用原始字节做签名验证，避免编码差异
  const raw = new Uint8Array(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] signature verify failed:", msg);
    return new Response(`Bad signature: ${msg}`, { status: 400 });
  }

  try {
    const [settings, priceToCredits] = await Promise.all([
      getSystemSettings(),
      getPriceToCreditsMap(),
    ]);

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;

        const metaUserId = s.metadata?.userId ? String(s.metadata.userId) : undefined;
        const priceId = (s.metadata?.priceId as string | undefined) || undefined;
        const mode = s.mode;
        const kind =
          (s.metadata?.kind as string | undefined) ||
          (mode === "subscription" ? "subscription" : "pack");
        const customerId =
          typeof s.customer === "string" ? s.customer : s.customer?.id;

        if (metaUserId && customerId) {
          await ensureStripeCustomerMap(metaUserId, customerId);
        }

        const resolvedUserId =
          metaUserId ||
          (await getUserIdByCustomer(customerId)) ||
          (await getUserIdByEmail(s.customer_details?.email || s.customer_email));

        if (mode === "subscription") {
          if (resolvedUserId && unlimitedEnabledFor(priceId, settings) && s.subscription) {
            const sub = await stripe.subscriptions.retrieve(String(s.subscription));
            await setUnlimitedUntil(resolvedUserId, sub.current_period_end);
          }
        } else if (mode === "payment") {
          const credits = priceId ? priceToCredits[priceId] ?? 0 : 0;
          if (resolvedUserId && credits > 0) {
            await updateUserCredits(resolvedUserId, credits);
            console.log(
              `[webhook] pack credits added: ${credits} to user ${resolvedUserId}`,
            );
          } else if (resolvedUserId && credits === 0) {
            console.warn("[webhook] pack priceId not mapped:", priceId);
          }
        }

        await logUserEvent({
          eventType: "checkout_completed",
          userId: resolvedUserId ?? undefined,
          email: s.customer_details?.email || s.customer_email || null,
          metadata: {
            kind,
            mode,
            priceId,
            sessionId: s.id,
            paymentStatus: s.payment_status,
            amountTotal: s.amount_total,
            currency: s.currency,
          },
        }).catch((err) => {
          console.error(
            "[webhook] failed to record checkout_completed event",
            err,
          );
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const priceId = inv.lines.data[0]?.price?.id as string | undefined;
        const credits = priceId ? priceToCredits[priceId] ?? 0 : 0;

        const userId =
          (await getUserIdByCustomer(
            typeof inv.customer === "string" ? inv.customer : inv.customer?.id,
          )) ||
          (inv.subscription
            ? (await stripe.subscriptions.retrieve(String(inv.subscription))).metadata
                ?.userId
            : undefined) ||
          (await getUserIdByEmail(inv.customer_email || undefined));

        if (!userId) {
          console.warn("[webhook] invoice.payment_succeeded: user not found", {
            customer: inv.customer,
            email: inv.customer_email,
          });
          break;
        }

        if (unlimitedEnabledFor(priceId, settings) && inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(inv.subscription));
          await setUnlimitedUntil(userId, sub.current_period_end);
        }

        const grantCredits =
          credits > 0 &&
          (!unlimitedEnabledFor(priceId, settings) ||
            settings.subsUnlimitedAlsoGrantCredits);

        if (grantCredits) {
          await updateUserCredits(userId, credits);
          console.log(`[webhook] subscription credits added: ${credits} to user ${userId}`);
        } else if (credits === 0) {
          console.warn("[webhook] subscription priceId not mapped:", priceId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id as string | undefined;

        const metaUserId = (sub.metadata?.userId as string | undefined) || undefined;
        const mappedUserId =
          metaUserId ||
          (await getUserIdByCustomer(
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
          ));

        if (mappedUserId && unlimitedEnabledFor(priceId, settings)) {
          const until =
            sub.status === "active" || sub.status === "trialing"
              ? sub.current_period_end
              : 0;
          await setUnlimitedUntil(mappedUserId, until);
        }
        break;
      }

      default:
        break;
    }

    return new Response("ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] handler error:", event.type, msg);
    return new Response(`handler error: ${msg}`, { status: 500 });
  }
}
