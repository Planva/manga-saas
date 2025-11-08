"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { getSessionFromCookie } from "@/utils/auth";
import { getSiteUrl } from "@/utils/site-url";
import { logUserEvent } from "@/utils/user-events";
import { getSystemSettings, type SystemSettings } from "@/utils/system-settings";

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



