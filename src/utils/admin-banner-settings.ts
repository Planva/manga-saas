import "server-only";

import { getDB } from "@/db";
import { adminBannerSettingsTable, type AdminBannerSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

const DEFAULT_ID = "default";

type NormalizedSettings = {
  isEnabled: boolean;
  messages: string[];
  itemsPerCycle: number;
  bannerHeight: number;
};

const defaultSettings: NormalizedSettings = {
  isEnabled: false,
  messages: [],
  itemsPerCycle: 1,
  bannerHeight: 36,
};

const coerceMessages = (messages: unknown): string[] => {
  if (Array.isArray(messages)) {
    return messages
      .map((message) => (typeof message === "string" ? message.trim() : ""))
      .filter((value) => value.length > 0);
  }

  if (typeof messages === "string" && messages.trim().length > 0) {
    try {
      const parsed = JSON.parse(messages);
      if (Array.isArray(parsed)) {
        return coerceMessages(parsed);
      }
    } catch {
      return [messages.trim()];
    }
  }

  return [];
};

const toNormalizedSettings = (settings: AdminBannerSettings | undefined): NormalizedSettings => {
  if (!settings) {
    return defaultSettings;
  }

  return {
    isEnabled: Boolean(settings.isEnabled),
    messages: coerceMessages(settings.messages),
    itemsPerCycle: Math.max(1, settings.itemsPerCycle ?? 1),
    bannerHeight: Math.max(24, Math.min(120, settings.bannerHeight ?? 36)),
  };
};

export async function getAdminBannerSettings(): Promise<NormalizedSettings> {
  noStore();
  const db = getDB();

  const record = await db.query.adminBannerSettingsTable.findFirst({
    where: eq(adminBannerSettingsTable.id, DEFAULT_ID),
  });

  return toNormalizedSettings(record ?? undefined);
}

type UpdateAdminBannerSettingsParams = {
  isEnabled: boolean;
  messages: string[];
  itemsPerCycle: number;
  bannerHeight: number;
};

export async function updateAdminBannerSettings({
  isEnabled,
  messages,
  itemsPerCycle,
  bannerHeight,
}: UpdateAdminBannerSettingsParams): Promise<NormalizedSettings> {
  const db = getDB();
  const trimmedMessages = messages
    .map((message) => message.trim())
    .filter((message) => message.length > 0);

  const normalizedMessages = trimmedMessages.length > 0 ? trimmedMessages : [];
  const normalizedItemsPerCycle = Math.max(1, Math.min(50, Math.floor(itemsPerCycle)));
  const normalizedBannerHeight = Math.max(24, Math.min(120, Math.floor(bannerHeight || 36)));

  await db
    .update(adminBannerSettingsTable)
    .set({
      isEnabled: isEnabled ? 1 : 0,
      messages: JSON.stringify(normalizedMessages),
      itemsPerCycle: normalizedItemsPerCycle,
      bannerHeight: normalizedBannerHeight,
      updatedAt: new Date(),
    })
    .where(eq(adminBannerSettingsTable.id, DEFAULT_ID));

  return {
    isEnabled,
    messages: normalizedMessages,
    itemsPerCycle: normalizedItemsPerCycle,
    bannerHeight: normalizedBannerHeight,
  };
}
