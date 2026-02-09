import type { SystemSettings } from "@/utils/system-settings";

export type MarketingPlanKind = "pack" | "subscription";

export type MarketingPricingPlan = {
  kind: MarketingPlanKind;
  priceId: string;
  title: string;
  price: string;
  subtitle: string;
  highlight?: boolean;
};

export function getMarketingPricingPlans(settings: SystemSettings): {
  packs: MarketingPricingPlan[];
  subscriptions: MarketingPricingPlan[];
} {
  const packs: MarketingPricingPlan[] = [];
  const subscriptions: MarketingPricingPlan[] = [];

  if (settings.enablePacks) {
    if (settings.stripePrices.packStarter) {
      packs.push({
        kind: "pack",
        title: "Starter Pack",
        price: "$6.90",
        subtitle: "≈300 translations",
        priceId: settings.stripePrices.packStarter,
      });
    }
    if (settings.stripePrices.packStandard) {
      packs.push({
        kind: "pack",
        title: "Standard Pack",
        price: "$19.90",
        subtitle: "≈1,000 translations",
        highlight: true,
        priceId: settings.stripePrices.packStandard,
      });
    }
    if (settings.stripePrices.packBulk) {
      packs.push({
        kind: "pack",
        title: "Bulk Pack",
        price: "$24.90",
        subtitle: "≈1,200 translations",
        priceId: settings.stripePrices.packBulk,
      });
    }
  }

  if (settings.enableSubscriptions) {
    if (settings.stripePrices.subMonthly) {
      subscriptions.push({
        kind: "subscription",
        title: "Monthly",
        price: "$19.90",
        subtitle: "1,200 credits / month · rollover",
        priceId: settings.stripePrices.subMonthly,
      });
    }
    if (settings.stripePrices.subYearly) {
      subscriptions.push({
        kind: "subscription",
        title: "Yearly",
        price: "$199.90",
        subtitle: "16,000 credits / year · rollover",
        highlight: true,
        priceId: settings.stripePrices.subYearly,
      });
    }
  }

  return { packs, subscriptions };
}
