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
