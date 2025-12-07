"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerAction, ZSAError } from "zsa";

import { requireAdmin } from "@/utils/auth";
import { getSystemSettings, updateSystemSettings } from "@/utils/system-settings";

const schema = z.object({
  enabled: z.boolean(),
});

export const updateAgenticBannerToggleAction = createServerAction()
  .input(schema)
  .handler(async ({ input }) => {
    await requireAdmin();

    try {
      const current = await getSystemSettings();
      const { stripePrices, ...rest } = current;
      void stripePrices;

      const settings = await updateSystemSettings({
        ...rest,
        agenticBannerEnabled: input.enabled,
      });

      revalidatePath("/", "layout");
      revalidatePath("/admin/system");

      return { settings };
    } catch (error) {
      console.error("[admin] updateAgenticBannerToggleAction failed", error);
      throw new ZSAError("INTERNAL_SERVER_ERROR", "更新失败，请稍后再试");
    }
  });
