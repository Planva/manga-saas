"use server";

import { createServerAction, ZSAError } from "zsa";
import { z } from "zod";
import { requireAdmin } from "@/utils/auth";
import { getSystemSettings, updateSystemSettings } from "@/utils/system-settings";
import { revalidatePath } from "next/cache";

const schema = z.object({
    enabled: z.boolean(),
});

export const updateMobileNavToggleAction = createServerAction()
    .input(schema)
    .handler(async ({ input }) => {
        await requireAdmin();
        console.log("[updateMobileNavToggleAction] Input:", input);

        try {
            const current = await getSystemSettings();
            const { stripePrices, ...rest } = current;
            void stripePrices;

            console.log("[updateMobileNavToggleAction] Calling updateSystemSettings with:", {
                ...rest,
                mobileBottomNavEnabled: input.enabled,
            });

            const settings = await updateSystemSettings({
                ...rest,
                mobileBottomNavEnabled: input.enabled,
            });

            console.log("[updateMobileNavToggleAction] Result settings:", settings.mobileBottomNavEnabled);

            revalidatePath("/", "layout");

            return { settings };
        } catch (error) {
            console.error("[admin] updateMobileNavToggleAction failed", error);
            throw new ZSAError("INTERNAL_SERVER_ERROR", "Failed to update settings");
        }
    });
