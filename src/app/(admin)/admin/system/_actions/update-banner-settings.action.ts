"use server";

import { createServerAction, ZSAError } from "zsa";
import { z } from "zod";
import { requireAdmin } from "@/utils/auth";
import { updateAdminBannerSettings } from "@/utils/admin-banner-settings";
import { revalidatePath } from "next/cache";

const MAX_MESSAGES = 20;

const updateBannerSettingsSchema = z.object({
  isEnabled: z.boolean(),
  messages: z
    .array(z.string().min(1).max(200))
    .max(MAX_MESSAGES),
  itemsPerCycle: z.number().int().min(1).max(MAX_MESSAGES),
  bannerHeight: z.number().int().min(24).max(120),
}).superRefine((data, ctx) => {
  if (data.isEnabled && data.messages.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please add at least one announcement when the banner is enabled.",
      path: ["messages"],
    });
  }
});

export const updateBannerSettingsAction = createServerAction()
  .input(updateBannerSettingsSchema)
  .handler(async ({ input }) => {
    await requireAdmin();

    try {
      const settings = await updateAdminBannerSettings(input);
      revalidatePath("/", "layout");
      revalidatePath("/admin", "layout");
      revalidatePath("/admin/system");
      return { settings };
    } catch (error) {
      console.error("Failed to update banner settings", error);
      throw new ZSAError("INTERNAL_SERVER_ERROR", "Failed to update banner settings");
    }
  });
