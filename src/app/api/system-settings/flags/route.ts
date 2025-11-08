import { NextResponse } from "next/server";

import { getSystemSettings } from "@/utils/system-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({
      dashboard: settings.dashboard,
      usage: {
        enablePacks: settings.enablePacks,
        enableSubscriptions: settings.enableSubscriptions,
        subsUnlimitedMode: settings.subsUnlimitedMode,
        subsUnlimitedAlsoGrantCredits: settings.subsUnlimitedAlsoGrantCredits,
        dailyFreeCreditsEnabled: settings.dailyFreeCreditsEnabled,
        dailyFreeCredits: settings.dailyFreeCredits,
        dailyFreeReset: settings.dailyFreeReset,
        perUseCreditCost: settings.perUseCreditCost,
        guestDailyFreeEnabled: settings.guestDailyFreeEnabled,
        guestDailyFreeCredits: settings.guestDailyFreeCredits,
        guestIpDailyLimit: settings.guestIpDailyLimit,
        guestDeviceDailyLimit: settings.guestDeviceDailyLimit,
        guestIpDailyCap: settings.guestIpDailyCap,
      },
    });
  } catch (error) {
    console.error("[api] failed to read system settings", error);
    return NextResponse.json(
      { error: "failed_to_load_settings" },
      { status: 500 },
    );
  }
}
