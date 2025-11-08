"use server";

import { createServerAction, ZSAError } from "zsa";
import { z } from "zod";
import { requireAdmin } from "@/utils/auth";
import { getSystemSettings, updateSystemSettings } from "@/utils/system-settings";
import { revalidatePath } from "next/cache";

const dashboardFlagsSchema = z.object({
  home: z.boolean(),
  teams: z.boolean(),
  marketplace: z.boolean(),
  billing: z.boolean(),
  settings: z.boolean(),
  landing: z.string().max(255),
});

export const updateDashboardFlagsAction = createServerAction()
  .input(dashboardFlagsSchema)
  .handler(async ({ input }) => {
    await requireAdmin();

    try {
      const current = await getSystemSettings();

      const updated = await updateSystemSettings({
        ...current,
        dashboard: {
          home: input.home,
          teams: input.teams,
          marketplace: input.marketplace,
          billing: input.billing,
          settings: input.settings,
          homeRoute: input.landing,
        },
      });

      revalidatePath("/dashboard", "layout");
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/teams");
      revalidatePath("/dashboard/marketplace");
      revalidatePath("/dashboard/billing");
      revalidatePath("/dashboard/settings");
      revalidatePath("/admin/system/navigation");

      return { dashboard: updated.dashboard };
    } catch (error) {
      console.error("[admin] Failed to update dashboard flags", error);
      throw new ZSAError("INTERNAL_SERVER_ERROR", "更新失败，请稍后再试");
    }
  });
