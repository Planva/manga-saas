"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { getSessionFromCookie } from "@/utils/auth";
import { getSiteUrl } from "@/utils/site-url";
import { logUserEvent } from "@/utils/user-events";
import { getSystemSettings, type SystemSettings } from "@/utils/system-settings";
import type Stripe from "stripe";

const preferredPopupPaymentMethods = [
  "paypal",
  "amazon_pay",
  "google_pay",
  "apple_pay",
  "link",
  "card",
  "kr_card",
  "kakao_pay",
  "naver_pay",
  "payco",
  "samsung_pay",
  "mb_way",
  "revolut_pay",
  "wechat_pay",
  "alipay",
  "multibanco",
  "bancontact",
  "eps",
  "pay_by_bank",
  "twint",
  "afterpay_clearpay",
  "billie",
  "klarna",
] as const;

const collectPriceIds = (settings: SystemSettings) => ({
  packs: [
    settings.stripePrices.packStarter,
    settings.stripePrices.packStandard,
    settings.stripePrices.packBulk,
  ].filter((id): id is string => Boolean(id && id.trim())),
  subscriptions: [
    settings.stripePrices.subMonthly,
    settings.stripePrices.subYearly,
  ].filter((id): id is string => Boolean(id && id.trim())),
});

const isProductEnabled = (
  kind: "pack" | "subscription",
  priceId: string,
  settings: SystemSettings,
) => {
  const trimmed = priceId.trim();
  if (!trimmed) return false;

  const ids = collectPriceIds(settings);

  if (kind === "pack") {
    if (!settings.enablePacks) return false;
    return ids.packs.includes(trimmed);
  }

  if (!settings.enableSubscriptions) return false;
  return ids.subscriptions.includes(trimmed);
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
};

export async function checkout({
  kind,
  priceId,
}: {
  kind: "pack" | "subscription";
  priceId: string;
}) {
  const settings = await getSystemSettings();

  if (!isProductEnabled(kind, priceId, settings)) {
    throw new Error("This payment option is currently disabled.");
  }

  const session = await getSessionFromCookie();
  if (!session?.user) redirect("/sign-in?next=/price");

  const stripe = getStripe();
  const siteUrl = getSiteUrl();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: kind === "subscription" ? "subscription" : "payment",
    customer_email: session.user.email!,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/dashboard/billing?status=success&kind=${kind}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard/billing?status=cancel&kind=${kind}`,
    allow_promotion_codes: true,
    metadata: { userId: String(session.user.id), kind, priceId },
  });

  await logUserEvent({
    eventType: "checkout_started",
    userId: String(session.user.id),
    email: session.user.email ?? null,
    metadata: { source: "billing", kind, priceId, sessionId: checkoutSession.id },
  });

  redirect(checkoutSession.url!);
}

export async function createCheckoutSessionUrl({
  kind,
  priceId,
}: {
  kind: "pack" | "subscription";
  priceId: string;
}): Promise<string> {
  const settings = await getSystemSettings();

  if (!isProductEnabled(kind, priceId, settings)) {
    throw new Error("This product is currently disabled.");
  }

  const session = await getSessionFromCookie();
  const siteUrl = getSiteUrl();

  if (!session?.user?.email) {
    return `${siteUrl}/sign-in?redirect=/dashboard/billing`;
  }

  const stripe = await getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: kind === "subscription" ? "subscription" : "payment",
    customer_email: session.user.email!,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/dashboard/billing?status=success&kind=${kind}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard/billing?status=cancel&kind=${kind}`,
    allow_promotion_codes: true,
    metadata: { userId: String(session.user.id), kind, priceId },
  });

  await logUserEvent({
    eventType: "checkout_started",
    userId: String(session.user.id),
    email: session.user.email ?? null,
    metadata: { source: "marketing", kind, priceId, sessionId: checkoutSession.id },
  });

  return checkoutSession.url!;
}

type PopupPaymentFlow = "payment_intent" | "subscription";

export type PopupPaymentSessionResult =
  | { clientSecret: string; sessionId: string }
  | { redirectUrl: string }
  | { errorMessage: string };

async function getOrCreateCustomerId(params: {
  stripe: Stripe;
  email: string;
  userId: string;
}): Promise<string> {
  const list = await params.stripe.customers.list({ email: params.email, limit: 1 });
  const existing = list.data[0]?.id;
  if (existing) return existing;

  const created = await params.stripe.customers.create({
    email: params.email,
    metadata: {
      userId: params.userId,
      source: "marketing_modal_payment_element",
    },
  });
  return created.id;
}

export async function createPopupPaymentSession({
  kind,
  priceId,
}: {
  kind: "pack" | "subscription";
  priceId: string;
}): Promise<PopupPaymentSessionResult> {
  try {
    if (kind !== "pack" && kind !== "subscription") {
      return { errorMessage: "Invalid payment type." };
    }

    const normalizedPriceId = typeof priceId === "string" ? priceId.trim() : "";
    if (!normalizedPriceId) {
      return { errorMessage: "Invalid price ID." };
    }

    const settings = await getSystemSettings();

    if (!isProductEnabled(kind, normalizedPriceId, settings)) {
      return { errorMessage: "This product is currently disabled." };
    }

    const session = await getSessionFromCookie();
    const siteUrl = getSiteUrl();

    if (!session?.user?.email) {
      return { redirectUrl: `${siteUrl}/sign-in?redirect=/dashboard/billing` };
    }

    const stripe = await getStripe();
    const userId = String(session.user.id);
    const customerId = await getOrCreateCustomerId({
      stripe,
      email: session.user.email!,
      userId,
    });

    let flow: PopupPaymentFlow;
    let clientSecret: string | null = null;
    let sessionId: string;

    if (kind === "pack") {
      const price = await stripe.prices.retrieve(normalizedPriceId);
      if (!price.unit_amount || !price.currency) {
        return { errorMessage: "Invalid one-time price configuration." };
      }
      if (price.recurring) {
        return { errorMessage: "The selected price is not a one-time plan." };
      }

      const intent = await stripe.paymentIntents.create({
        amount: price.unit_amount,
        currency: price.currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        metadata: {
          source: "marketing_modal_payment_element",
          userId,
          kind,
          priceId: normalizedPriceId,
        },
      });

      flow = "payment_intent";
      clientSecret = intent.client_secret;
      sessionId = intent.id;
    } else {
      const price = await stripe.prices.retrieve(normalizedPriceId);
      if (!price.recurring) {
        return { errorMessage: "The selected price is not a subscription plan." };
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: normalizedPriceId }],
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        metadata: {
          source: "marketing_modal_payment_element",
          userId,
          kind,
          priceId: normalizedPriceId,
        },
        expand: ["latest_invoice.payment_intent"],
      });

      const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
      const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent | null;

      flow = "subscription";
      clientSecret = paymentIntent?.client_secret ?? null;
      sessionId = subscription.id;
    }

    if (!clientSecret) {
      return { errorMessage: "Failed to initialize popup payment." };
    }

    await logUserEvent({
      eventType: "checkout_started",
      userId,
      email: session.user.email ?? null,
      metadata: {
        source: "marketing_modal",
        kind,
        priceId: normalizedPriceId,
        flow,
        sessionId,
        preferredMethods: preferredPopupPaymentMethods,
      },
    }).catch((eventLogError) => {
      console.error("[popup-payment] failed to write checkout_started event:", toErrorMessage(eventLogError));
    });

    return { clientSecret, sessionId };
  } catch (error) {
    console.error(
      "[popup-payment] create session failed:",
      `kind=${kind}`,
      `priceId=${priceId}`,
      toErrorMessage(error),
    );
    return { errorMessage: "Failed to initialize payment. Please try again." };
  }
}

export async function finalizePopupPackPayment({
  paymentIntentId,
  priceId,
}: {
  paymentIntentId: string;
  priceId: string;
}): Promise<{ success: true; alreadyProcessed?: boolean }> {
  const [{ getPriceToCreditsMap }, { updateUserCredits }, { getDB }, { creditTransactionTable }, { eq }] =
    await Promise.all([
      import("@/config/price-to-credits"),
      import("@/utils/credits"),
      import("@/db"),
      import("@/db/schema"),
      import("drizzle-orm"),
    ]);

  const session = await getSessionFromCookie();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = String(session.user.id);
  const stripe = await getStripe();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (intent.status !== "succeeded") {
    throw new Error("Payment is not completed.");
  }
  if (intent.metadata?.userId !== userId) {
    throw new Error("Payment ownership mismatch.");
  }
  if (intent.metadata?.priceId !== priceId) {
    throw new Error("Payment price mismatch.");
  }

  const db = getDB();
  const exists = await db
    .select({ id: creditTransactionTable.id })
    .from(creditTransactionTable)
    .where(eq(creditTransactionTable.paymentIntentId, paymentIntentId))
    .get();

  if (exists?.id) {
    return { success: true, alreadyProcessed: true };
  }

  const priceToCredits = await getPriceToCreditsMap();
  const credits = priceToCredits[priceId] ?? 0;
  if (credits <= 0) {
    throw new Error("This plan has no mapped credits.");
  }

  await updateUserCredits(userId, credits, {
    type: "PURCHASE",
    description: `Purchased credits (${priceId})`,
    paymentIntentId,
  });

  return { success: true };
}
