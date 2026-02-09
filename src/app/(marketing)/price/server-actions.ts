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

const toPopupInitErrorMessage = (error: unknown, priceId: string): string => {
  const fallback = "Failed to initialize payment. Please try again.";
  const message = toErrorMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("missing stripe_secret_key")) {
    return "Payment service is not configured (missing STRIPE_SECRET_KEY).";
  }
  if (normalized.includes("publishable key (pk_*) is configured")) {
    return "STRIPE_SECRET_KEY is set to a publishable key (pk_*). Set a secret key (sk_* or rk_*) in runtime secrets.";
  }
  if (normalized.includes("from cloudflare_env")) {
    return "Cloudflare runtime STRIPE_SECRET_KEY is invalid. Please check Worker secret STRIPE_SECRET_KEY (must be sk_* or rk_*).";
  }
  if (normalized.includes("publishable api key")) {
    return "STRIPE_SECRET_KEY is using a publishable key. Replace it with a secret key (sk_* or rk_*).";
  }
  if (normalized.includes("invalid stripe_secret_key format")) {
    return "Invalid STRIPE_SECRET_KEY format. Expected sk_* or rk_*.";
  }
  if (normalized.includes("no such price")) {
    return `Stripe price not found: ${priceId}. Check key mode and price IDs.`;
  }
  if (normalized.includes("invalid api key")) {
    return "Stripe API key is invalid. Please verify STRIPE_SECRET_KEY.";
  }
  if (normalized.includes("permission") && normalized.includes("customer")) {
    return "Stripe key lacks customer permission. Please update API key permissions.";
  }

  const stripeLike = error as {
    message?: string;
    raw?: { message?: string };
  } | null;
  const rawMessage = stripeLike?.raw?.message?.trim();
  if (rawMessage) {
    return rawMessage;
  }
  const directMessage = stripeLike?.message?.trim();
  if (directMessage) {
    return directMessage;
  }
  return fallback;
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
}): Promise<{ url: string } | { errorMessage: string }> {
  try {
    const settings = await getSystemSettings();

    if (!isProductEnabled(kind, priceId, settings)) {
      return { errorMessage: "This product is currently disabled." };
    }

    const session = await getSessionFromCookie();
    const siteUrl = getSiteUrl();

    if (!session?.user?.email) {
      return { url: `${siteUrl}/sign-in?redirect=/dashboard/billing` };
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
    }).catch((eventLogError) => {
      console.error("[checkout] failed to write checkout_started event:", toErrorMessage(eventLogError));
    });

    if (!checkoutSession.url) {
      return { errorMessage: "Failed to create checkout session URL." };
    }

    return { url: checkoutSession.url };
  } catch (error) {
    const userMessage = toPopupInitErrorMessage(error, priceId);
    console.error(
      "[checkout] create checkout session url failed:",
      `kind=${kind}`,
      `priceId=${priceId}`,
      toErrorMessage(error),
      `userMessage=${userMessage}`,
    );
    return { errorMessage: userMessage };
  }
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
  try {
    const list = await params.stripe.customers.list({ email: params.email, limit: 1 });
    const existing = list.data[0]?.id;
    if (existing) return existing;
  } catch (error) {
    console.warn(
      "[popup-payment] customers.list failed, creating customer directly:",
      toErrorMessage(error),
    );
  }

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
    const userMessage = toPopupInitErrorMessage(error, priceId);
    console.error(
      "[popup-payment] create session failed:",
      `kind=${kind}`,
      `priceId=${priceId}`,
      toErrorMessage(error),
      `userMessage=${userMessage}`,
    );
    return { errorMessage: userMessage };
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
