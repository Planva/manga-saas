import { getMarketingPricingPlans } from "@/config/marketing-pricing-plans";
import { getSystemSettings } from "@/utils/system-settings";
import TestPopupPaymentButtonClient from "./test-popup-payment-button.client";

export default async function TestPopupPaymentButton() {
  const settings = await getSystemSettings();
  const { packs, subscriptions } = getMarketingPricingPlans(settings);

  if (!packs.length && !subscriptions.length) {
    return null;
  }

  return <TestPopupPaymentButtonClient packs={packs} subscriptions={subscriptions} />;
}
