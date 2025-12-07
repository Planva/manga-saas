"use server";

import { createServerAction, ZSAError } from "zsa";
import { z } from "zod";
import { requireAdmin } from "@/utils/auth";
import { getSystemSettings, updateSystemSettings } from "@/utils/system-settings";
import { revalidatePath } from "next/cache";

const schema = z.object({
  enablePacks: z.boolean(),
  enableSubscriptions: z.boolean(),
  subsUnlimitedMode: z.enum(["off", "monthly", "yearly", "all"]),
  subsUnlimitedAlsoGrantCredits: z.boolean(),
  dailyFreeCreditsEnabled: z.boolean(),
  dailyFreeCredits: z.coerce.number().int().min(0).max(1_000_000),
  dailyFreeReset: z.boolean(),
  perUseCreditCost: z.coerce.number().int().min(0).max(1_000_000),
  guestDailyFreeEnabled: z.boolean(),
  guestDailyFreeCredits: z.coerce.number().int().min(0).max(1_000_000),
  guestIpDailyLimit: z.coerce.number().int().min(0).max(1_000_000),
  guestDeviceDailyLimit: z.coerce.number().int().min(0).max(1_000_000),
  guestIpDailyCap: z.coerce.number().int().min(0).max(1_000_000),
});

export const updateSystemSettingsAction = createServerAction()
  .input(schema)
  .handler(async ({ input }) => {
    await requireAdmin();

    try {
      const current = await getSystemSettings();
      const { stripePrices, ...rest } = current;
      void stripePrices;

      const settings = await updateSystemSettings({
        ...rest,
        enablePacks: input.enablePacks,
        enableSubscriptions: input.enableSubscriptions,
        subsUnlimitedMode: input.subsUnlimitedMode,
        subsUnlimitedAlsoGrantCredits: input.subsUnlimitedAlsoGrantCredits,
        dailyFreeCreditsEnabled: input.dailyFreeCreditsEnabled,
        dailyFreeCredits: input.dailyFreeCredits,
        dailyFreeReset: input.dailyFreeReset,
        perUseCreditCost: input.perUseCreditCost,
        guestDailyFreeEnabled: input.guestDailyFreeEnabled,
        guestDailyFreeCredits: input.guestDailyFreeCredits,
        guestIpDailyLimit: input.guestIpDailyLimit,
        guestDeviceDailyLimit: input.guestDeviceDailyLimit,
        guestIpDailyCap: input.guestIpDailyCap,
        dashboard: current.dashboard,
      });

      revalidatePath("/", "layout");
      revalidatePath("/price");
      revalidatePath("/dashboard", "layout");
      revalidatePath("/dashboard/billing");
      revalidatePath("/admin/system/credits");

      return { settings };
    } catch (error) {
      console.error("[admin] updateSystemSettingsAction failed", error);
      throw new ZSAError("INTERNAL_SERVER_ERROR", "保存失败，请稍后再试");
    }
  });
