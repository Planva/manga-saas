<<<<<<< HEAD
=======
// src/app/api/stripe/webhook/route.ts
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

import { getDB } from "@/db";
import { eq } from "drizzle-orm";
import { userTable, stripeCustomerMapTable } from "@/db/schema";
import { updateUserCredits } from "@/utils/credits";
<<<<<<< HEAD
import { getPriceToCreditsMap } from "@/config/price-to-credits";
import { getSystemSettings } from "@/utils/system-settings";
import { logUserEvent } from "@/utils/user-events";
=======
import { PRICE_TO_CREDITS } from "@/config/price-to-credits";

// —— 订阅“无限使用”相关开关 —— //
const MODE = (process.env.FEATURE_SUBS_UNLIMITED_MODE ?? "off") as
  | "off"
  | "monthly"
  | "yearly"
  | "all";
const ALSO_GRANT =
  process.env.FEATURE_SUBS_UNLIMITED_ALSO_GRANT_CREDITS === "true";

const SUB_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_SUB_MONTHLY!;
const SUB_YEARLY = process.env.NEXT_PUBLIC_STRIPE_SUB_YEARLY!;

function unlimitedEnabledFor(priceId?: string) {
  if (!priceId) return false;
  if (MODE === "off") return false;
  if (MODE === "all") return priceId === SUB_MONTHLY || priceId === SUB_YEARLY;
  if (MODE === "monthly") return priceId === SUB_MONTHLY;
  if (MODE === "yearly") return priceId === SUB_YEARLY;
  return false;
}
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2

async function setUnlimitedUntil(userId: string, untilUnixSec: number) {
  const db = getDB();
  await db
    .update(userTable)
    .set({ unlimitedUsageUntil: untilUnixSec, updatedAt: new Date() })
    .where(eq(userTable.id, userId));
}

<<<<<<< HEAD
=======
/** 写入/查询 customerId<->userId 映射（映射表） */
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
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

<<<<<<< HEAD
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

=======
// ❌ 不要使用 edge runtime（OpenNext 需要把 edge 函数拆分到独立 worker）；保持默认 Node/Server
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET missing");
    return new Response("Webhook secret missing", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature") || "";

<<<<<<< HEAD
  // 使用原始字节做签名验证，避免编码差异
=======
  // ✅ 用原始字节做签名验证，避免编码差异
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
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
<<<<<<< HEAD
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

        let userId =
          (await getUserIdByCustomer(
            typeof inv.customer === "string" ? inv.customer : inv.customer?.id,
          )) ||
          (inv.subscription
            ? (await stripe.subscriptions.retrieve(String(inv.subscription))).metadata
                ?.userId
=======
    switch (event.type) {
      /**
       * 1) Checkout 完成
       * - 一次性包（pack）：在这里直接发积分（用 metadata.priceId）
       * - 订阅（subscription）：这里只建立映射/（可选）设置无限期；发积分放到 invoice.payment_succeeded
       */
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;

        // 回写 customer 映射
        const metaUserId = s.metadata?.userId ? String(s.metadata.userId) : undefined;
        if (metaUserId && s.customer) {
          await ensureStripeCustomerMap(metaUserId, typeof s.customer === "string" ? s.customer : s.customer.id);
        }

        const mode = s.mode; // 'payment' | 'subscription'
        const priceId =
          (s.metadata?.priceId as string | undefined) ||
          undefined;

        if (mode === "subscription") {
          // 可选：开启“无限期”，设置当前订阅周期结束时间
          if (metaUserId && unlimitedEnabledFor(priceId) && s.subscription) {
            const sub = await stripe.subscriptions.retrieve(String(s.subscription));
            await setUnlimitedUntil(metaUserId, sub.current_period_end);
          }
          // 积分走 invoice.payment_succeeded，避免双发
          break;
        }

        if (mode === "payment") {
          // 一次性包：直接发积分
          // 优先 metadata.userId，其次通过 customer/email 反查
          let userId =
            metaUserId ||
            (await getUserIdByCustomer(typeof s.customer === "string" ? s.customer : s.customer?.id)) ||
            (await getUserIdByEmail(s.customer_details?.email || s.customer_email));

          const credits = priceId ? PRICE_TO_CREDITS[priceId] ?? 0 : 0;
          if (userId && credits > 0) {
            await updateUserCredits(userId, credits);
            console.log(`[webhook] pack credits added: ${credits} to user ${userId}`);
          } else if (userId && credits === 0) {
            console.warn("[webhook] pack priceId not mapped:", priceId);
          }
        }
        break;
      }

      /**
       * 2) 每期扣款成功（订阅首期/续费都会触发）
       * - 发放周期积分（PRICE_TO_CREDITS）
       * - 若开启“无限期”，刷新截止时间
       */
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const priceId = inv.lines.data[0]?.price?.id as string | undefined;
        const credits = priceId ? PRICE_TO_CREDITS[priceId] ?? 0 : 0;

        // 推断 userId：映射 -> 订阅.metadata.userId -> email
        let userId =
          (await getUserIdByCustomer(typeof inv.customer === "string" ? inv.customer : inv.customer?.id)) ||
          (inv.subscription
            ? (await stripe.subscriptions.retrieve(String(inv.subscription))).metadata?.userId
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
            : undefined) ||
          (await getUserIdByEmail(inv.customer_email || undefined));

        if (!userId) {
<<<<<<< HEAD
=======
          // 找不到用户就跳过；返回 200 避免 Stripe 重试风暴
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
          console.warn("[webhook] invoice.payment_succeeded: user not found", {
            customer: inv.customer,
            email: inv.customer_email,
          });
          break;
        }

<<<<<<< HEAD
        if (unlimitedEnabledFor(priceId, settings) && inv.subscription) {
=======
        // 刷新“无限期”（若开启）
        if (unlimitedEnabledFor(priceId) && inv.subscription) {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
          const sub = await stripe.subscriptions.retrieve(String(inv.subscription));
          await setUnlimitedUntil(userId, sub.current_period_end);
        }

<<<<<<< HEAD
        const grantCredits =
          credits > 0 &&
          (!unlimitedEnabledFor(priceId, settings) ||
            settings.subsUnlimitedAlsoGrantCredits);

        if (grantCredits) {
=======
        // 发积分（如果未启无限，或启了无限但 ALSO_GRANT=true）
        if (credits > 0 && (!unlimitedEnabledFor(priceId) || ALSO_GRANT)) {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
          await updateUserCredits(userId, credits);
          console.log(`[webhook] subscription credits added: ${credits} to user ${userId}`);
        } else if (credits === 0) {
          console.warn("[webhook] subscription priceId not mapped:", priceId);
        }
        break;
      }

<<<<<<< HEAD
=======
      /**
       * 3) 订阅状态变化：同步/清零无限使用窗口
       */
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id as string | undefined;

        const metaUserId = (sub.metadata?.userId as string | undefined) || undefined;
        const mappedUserId =
          metaUserId ||
<<<<<<< HEAD
          (await getUserIdByCustomer(
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
          ));

        if (mappedUserId && unlimitedEnabledFor(priceId, settings)) {
=======
          (await getUserIdByCustomer(typeof sub.customer === "string" ? sub.customer : sub.customer?.id));

        if (mappedUserId && unlimitedEnabledFor(priceId)) {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
          const until =
            sub.status === "active" || sub.status === "trialing"
              ? sub.current_period_end
              : 0;
          await setUnlimitedUntil(mappedUserId, until);
        }
        break;
      }

      default:
<<<<<<< HEAD
=======
        // 其它事件忽略（保持 200 即可）
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
        break;
    }

    return new Response("ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] handler error:", event.type, msg);
<<<<<<< HEAD
=======
    // 只有真正不可恢复的错误才返回 500，其它尽量 200，避免 Stripe 重试风暴
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    return new Response(`handler error: ${msg}`, { status: 500 });
  }
}
