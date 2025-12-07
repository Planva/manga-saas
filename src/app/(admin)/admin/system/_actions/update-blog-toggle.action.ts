"use server";

import { createServerAction, ZSAError } from "zsa";
import { z } from "zod";
import { requireAdmin } from "@/utils/auth";
import { getSystemSettings, updateSystemSettings } from "@/utils/system-settings";
import { revalidatePath } from "next/cache";

const schema = z.object({
  enabled: z.boolean(),
});

export const updateBlogToggleAction = createServerAction()
  .input(schema)
  .handler(async ({ input }) => {
    await requireAdmin();

    try {
      const current = await getSystemSettings();
      const { stripePrices, ...rest } = current;
      void stripePrices;

      const settings = await updateSystemSettings({
        ...rest,
        blogEnabled: input.enabled,
      });

      revalidatePath("/", "layout");
      revalidatePath("/blog");

      return { settings };
    } catch (error) {
      console.error("[admin] updateBlogToggleAction failed", error);
      throw new ZSAError("INTERNAL_SERVER_ERROR", "更新失败，请稍后再试");
    }
  });
