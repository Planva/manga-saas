<<<<<<< HEAD
import { getSystemSettings } from "@/utils/system-settings";

const DEFAULT_MAPPING = {
  packStarter: 300,
  packStandard: 1000,
  packBulk: 1200,
  subMonthly: 1200,
  subYearly: 16000,
} as const;

export async function getPriceToCreditsMap(): Promise<Record<string, number>> {
  const settings = await getSystemSettings();
  const map: Record<string, number> = {};

  if (settings.stripePrices.packStarter) {
    map[settings.stripePrices.packStarter] = DEFAULT_MAPPING.packStarter;
  }
  if (settings.stripePrices.packStandard) {
    map[settings.stripePrices.packStandard] = DEFAULT_MAPPING.packStandard;
  }
  if (settings.stripePrices.packBulk) {
    map[settings.stripePrices.packBulk] = DEFAULT_MAPPING.packBulk;
  }
  if (settings.stripePrices.subMonthly) {
    map[settings.stripePrices.subMonthly] = DEFAULT_MAPPING.subMonthly;
  }
  if (settings.stripePrices.subYearly) {
    map[settings.stripePrices.subYearly] = DEFAULT_MAPPING.subYearly;
  }

  return map;
}

export async function getCreditsForPrice(priceId?: string | null): Promise<number> {
  if (!priceId) return 0;
  const map = await getPriceToCreditsMap();
  return map[priceId] ?? 0;
}
=======
// src/config/price-to-credits.ts
export const PRICE_TO_CREDITS: Record<string, number> = {
    [process.env.NEXT_PUBLIC_STRIPE_PACK_STARTER!]: 300,
    [process.env.NEXT_PUBLIC_STRIPE_PACK_STANDARD!]: 1000,
    [process.env.NEXT_PUBLIC_STRIPE_PACK_BULK!]: 1200,
    [process.env.NEXT_PUBLIC_STRIPE_SUB_MONTHLY!]: 1200,   // 每月
    [process.env.NEXT_PUBLIC_STRIPE_SUB_YEARLY!]: 16000,   // 每年
  };
  
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
