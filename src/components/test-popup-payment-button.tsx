import { getMarketingPricingPlans } from "@/config/marketing-pricing-plans";
import { getSystemSettings } from "@/utils/system-settings";
import TestPopupPaymentButtonClient from "./test-popup-payment-button.client";
import {
  getStripePublishableKey,
  getStripePublishableKeyDebugInfo,
} from "@/lib/stripe-publishable-key";

export default async function TestPopupPaymentButton() {
  const settings = await getSystemSettings();
  const { packs, subscriptions } = getMarketingPricingPlans(settings);
  const stripePublishableKey = getStripePublishableKey();

  if (!packs.length && !subscriptions.length) {
    return null;
  }

  if (!stripePublishableKey) {
    console.error(
      "[payment-modal] missing Stripe publishable key for popup payment",
      getStripePublishableKeyDebugInfo(),
    );
  }

  return (
    <TestPopupPaymentButtonClient
      packs={packs}
      subscriptions={subscriptions}
      stripePublishableKey={stripePublishableKey}
    />
  );
}
