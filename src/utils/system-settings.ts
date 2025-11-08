"use server";

import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { eq } from "drizzle-orm";

import { getDB } from "@/db";
import {
  adminSystemSettingsTable,
  type AdminSystemSettings,
} from "@/db/schema";

const DEFAULT_ID = "default";

const boolFromString = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  return fallback;
};

const intFrom = (
  value: unknown,
  fallback: number,
  opts: { min?: number; max?: number } = {},
): number => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  let next = Number.isFinite(parsed) ? parsed : fallback;

  if (Number.isFinite(opts.min)) {
    next = Math.max(opts.min as number, next);
  }
  if (Number.isFinite(opts.max)) {
    next = Math.min(opts.max as number, next);
  }

  return next;
};

const normalizeRoute = (value: unknown, fallback = "/dashboard/billing") => {
  const raw = String(value ?? "").trim() || fallback;
  return raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
};

const normalizeMode = (value: unknown): "off" | "monthly" | "yearly" | "all" => {
  const v = String(value ?? "off").toLowerCase();
  if (v === "monthly" || v === "yearly" || v === "all") {
    return v;
  }
  return "off";
};

const envFallback = {
  stripePackStarter: process.env.NEXT_PUBLIC_STRIPE_PACK_STARTER || null,
  stripePackStandard: process.env.NEXT_PUBLIC_STRIPE_PACK_STANDARD || null,
  stripePackBulk: process.env.NEXT_PUBLIC_STRIPE_PACK_BULK || null,
  stripeSubMonthly: process.env.NEXT_PUBLIC_STRIPE_SUB_MONTHLY || null,
  stripeSubYearly: process.env.NEXT_PUBLIC_STRIPE_SUB_YEARLY || null,
  enablePacks: boolFromString(process.env.FEATURE_ENABLE_PACKS, true),
  enableSubscriptions: boolFromString(process.env.FEATURE_ENABLE_SUBSCRIPTIONS, true),
  subsUnlimitedMode: normalizeMode(process.env.FEATURE_SUBS_UNLIMITED_MODE),
  subsUnlimitedAlsoGrantCredits: boolFromString(
    process.env.FEATURE_SUBS_UNLIMITED_ALSO_GRANT_CREDITS,
    false,
  ),
  dailyFreeCreditsEnabled: boolFromString(
    process.env.FEATURE_DAILY_FREE_CREDITS_ENABLED,
    true,
  ),
  dailyFreeCredits: intFrom(process.env.DAILY_FREE_CREDITS, 10, { min: 0 }),
  dailyFreeReset: boolFromString(process.env.DAILY_FREE_RESET, false),
  perUseCreditCost: intFrom(process.env.PER_USE_CREDIT_COST, 1, { min: 0 }),
  guestDailyFreeEnabled: boolFromString(
    process.env.FEATURE_GUEST_DAILY_FREE_ENABLED,
    true,
  ),
  guestDailyFreeCredits: intFrom(process.env.GUEST_DAILY_FREE_CREDITS, 10, { min: 0 }),
  guestIpDailyLimit: intFrom(process.env.GUEST_IP_DAILY_LIMIT, 10, { min: 0 }),
  guestDeviceDailyLimit: intFrom(process.env.GUEST_DEVICE_DAILY_LIMIT, 100, { min: 0 }),
  guestIpDailyCap: intFrom(process.env.GUEST_IP_DAILY_CAP, 20, { min: 0 }),
  featureDashboardHome: boolFromString(process.env.FEATURE_DASHBOARD_HOME, true),
  featureDashboardTeams: boolFromString(process.env.FEATURE_DASHBOARD_TEAMS, true),
  featureDashboardMarketplace: boolFromString(
    process.env.FEATURE_DASHBOARD_MARKETPLACE,
    true,
  ),
  featureDashboardBilling: boolFromString(process.env.FEATURE_DASHBOARD_BILLING, true),
  featureDashboardSettings: boolFromString(process.env.FEATURE_DASHBOARD_SETTINGS, true),
  dashboardHomeRoute: normalizeRoute(process.env.DASHBOARD_HOME_ROUTE),
};

export type SystemSettings = {
  stripePrices: {
    packStarter: string | null;
    packStandard: string | null;
    packBulk: string | null;
    subMonthly: string | null;
    subYearly: string | null;
  };
  enablePacks: boolean;
  enableSubscriptions: boolean;
  subsUnlimitedMode: "off" | "monthly" | "yearly" | "all";
  subsUnlimitedAlsoGrantCredits: boolean;
  dailyFreeCreditsEnabled: boolean;
  dailyFreeCredits: number;
  dailyFreeReset: boolean;
  perUseCreditCost: number;
  guestDailyFreeEnabled: boolean;
  guestDailyFreeCredits: number;
  guestIpDailyLimit: number;
  guestDeviceDailyLimit: number;
  guestIpDailyCap: number;
  dashboard: {
    home: boolean;
    teams: boolean;
    marketplace: boolean;
    billing: boolean;
    settings: boolean;
    homeRoute: string;
  };
};

const normalizeRecord = (record?: AdminSystemSettings | null): SystemSettings => {
  if (!record) {
    return {
      stripePrices: {
        packStarter: envFallback.stripePackStarter,
        packStandard: envFallback.stripePackStandard,
        packBulk: envFallback.stripePackBulk,
        subMonthly: envFallback.stripeSubMonthly,
        subYearly: envFallback.stripeSubYearly,
      },
      enablePacks: envFallback.enablePacks,
      enableSubscriptions: envFallback.enableSubscriptions,
      subsUnlimitedMode: envFallback.subsUnlimitedMode,
      subsUnlimitedAlsoGrantCredits: envFallback.subsUnlimitedAlsoGrantCredits,
      dailyFreeCreditsEnabled: envFallback.dailyFreeCreditsEnabled,
      dailyFreeCredits: envFallback.dailyFreeCredits,
      dailyFreeReset: envFallback.dailyFreeReset,
      perUseCreditCost: envFallback.perUseCreditCost,
      guestDailyFreeEnabled: envFallback.guestDailyFreeEnabled,
      guestDailyFreeCredits: envFallback.guestDailyFreeCredits,
      guestIpDailyLimit: envFallback.guestIpDailyLimit,
      guestDeviceDailyLimit: envFallback.guestDeviceDailyLimit,
      guestIpDailyCap: envFallback.guestIpDailyCap,
      dashboard: {
        home: envFallback.featureDashboardHome,
        teams: envFallback.featureDashboardTeams,
        marketplace: envFallback.featureDashboardMarketplace,
        billing: envFallback.featureDashboardBilling,
        settings: envFallback.featureDashboardSettings,
        homeRoute: envFallback.dashboardHomeRoute,
      },
    };
  }

  return {
    stripePrices: {
      packStarter: record.stripePackStarter ?? envFallback.stripePackStarter,
      packStandard: record.stripePackStandard ?? envFallback.stripePackStandard,
      packBulk: record.stripePackBulk ?? envFallback.stripePackBulk,
      subMonthly: record.stripeSubMonthly ?? envFallback.stripeSubMonthly,
      subYearly: record.stripeSubYearly ?? envFallback.stripeSubYearly,
    },
    enablePacks: boolFromString(record.enablePacks, envFallback.enablePacks),
    enableSubscriptions: boolFromString(
      record.enableSubscriptions,
      envFallback.enableSubscriptions,
    ),
    subsUnlimitedMode: normalizeMode(record.subsUnlimitedMode ?? envFallback.subsUnlimitedMode),
    subsUnlimitedAlsoGrantCredits: boolFromString(
      record.subsUnlimitedAlsoGrantCredits,
      envFallback.subsUnlimitedAlsoGrantCredits,
    ),
    dailyFreeCreditsEnabled: boolFromString(
      record.dailyFreeCreditsEnabled,
      envFallback.dailyFreeCreditsEnabled,
    ),
    dailyFreeCredits: intFrom(record.dailyFreeCredits, envFallback.dailyFreeCredits, {
      min: 0,
    }),
    dailyFreeReset: boolFromString(
      record.dailyFreeReset,
      envFallback.dailyFreeReset,
    ),
    perUseCreditCost: intFrom(record.perUseCreditCost, envFallback.perUseCreditCost, {
      min: 0,
    }),
    guestDailyFreeEnabled: boolFromString(
      record.guestDailyFreeEnabled,
      envFallback.guestDailyFreeEnabled,
    ),
    guestDailyFreeCredits: intFrom(
      record.guestDailyFreeCredits,
      envFallback.guestDailyFreeCredits,
      { min: 0 },
    ),
    guestIpDailyLimit: intFrom(record.guestIpDailyLimit, envFallback.guestIpDailyLimit, {
      min: 0,
    }),
    guestDeviceDailyLimit: intFrom(
      record.guestDeviceDailyLimit,
      envFallback.guestDeviceDailyLimit,
      { min: 0 },
    ),
    guestIpDailyCap: intFrom(record.guestIpDailyCap, envFallback.guestIpDailyCap, {
      min: 0,
    }),
    dashboard: {
      home: boolFromString(record.featureDashboardHome, envFallback.featureDashboardHome),
      teams: boolFromString(record.featureDashboardTeams, envFallback.featureDashboardTeams),
      marketplace: boolFromString(
        record.featureDashboardMarketplace,
        envFallback.featureDashboardMarketplace,
      ),
      billing: boolFromString(
        record.featureDashboardBilling,
        envFallback.featureDashboardBilling,
      ),
      settings: boolFromString(
        record.featureDashboardSettings,
        envFallback.featureDashboardSettings,
      ),
      homeRoute: normalizeRoute(
        record.dashboardHomeRoute ?? envFallback.dashboardHomeRoute,
        envFallback.dashboardHomeRoute,
      ),
    },
  };
};

export async function getSystemSettings(): Promise<SystemSettings> {
  noStore();
  const db = getDB();

  const record = await db.query.adminSystemSettingsTable.findFirst({
    where: eq(adminSystemSettingsTable.id, DEFAULT_ID),
  });

  return normalizeRecord(record ?? undefined);
}

type UpdateSystemSettingsParams = {
  stripePrices: {
    packStarter: string | null;
    packStandard: string | null;
    packBulk: string | null;
    subMonthly: string | null;
    subYearly: string | null;
  };
  enablePacks: boolean;
  enableSubscriptions: boolean;
  subsUnlimitedMode: "off" | "monthly" | "yearly" | "all";
  subsUnlimitedAlsoGrantCredits: boolean;
  dailyFreeCreditsEnabled: boolean;
  dailyFreeCredits: number;
  dailyFreeReset: boolean;
  perUseCreditCost: number;
  guestDailyFreeEnabled: boolean;
  guestDailyFreeCredits: number;
  guestIpDailyLimit: number;
  guestDeviceDailyLimit: number;
  guestIpDailyCap: number;
  dashboard: {
    home: boolean;
    teams: boolean;
    marketplace: boolean;
    billing: boolean;
    settings: boolean;
    homeRoute: string;
  };
};

const emptyToNull = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value.trim() : null;

export async function updateSystemSettings(params: UpdateSystemSettingsParams): Promise<SystemSettings> {
  const db = getDB();

  await db
    .update(adminSystemSettingsTable)
    .set({
      stripePackStarter: emptyToNull(params.stripePrices.packStarter),
      stripePackStandard: emptyToNull(params.stripePrices.packStandard),
      stripePackBulk: emptyToNull(params.stripePrices.packBulk),
      stripeSubMonthly: emptyToNull(params.stripePrices.subMonthly),
      stripeSubYearly: emptyToNull(params.stripePrices.subYearly),
      enablePacks: params.enablePacks ? 1 : 0,
      enableSubscriptions: params.enableSubscriptions ? 1 : 0,
      subsUnlimitedMode: params.subsUnlimitedMode,
      subsUnlimitedAlsoGrantCredits: params.subsUnlimitedAlsoGrantCredits ? 1 : 0,
      dailyFreeCreditsEnabled: params.dailyFreeCreditsEnabled ? 1 : 0,
      dailyFreeCredits: Math.max(0, Math.floor(params.dailyFreeCredits)),
      dailyFreeReset: params.dailyFreeReset ? 1 : 0,
      perUseCreditCost: Math.max(0, Math.floor(params.perUseCreditCost)),
      guestDailyFreeEnabled: params.guestDailyFreeEnabled ? 1 : 0,
      guestDailyFreeCredits: Math.max(0, Math.floor(params.guestDailyFreeCredits)),
      guestIpDailyLimit: Math.max(0, Math.floor(params.guestIpDailyLimit)),
      guestDeviceDailyLimit: Math.max(0, Math.floor(params.guestDeviceDailyLimit)),
      guestIpDailyCap: Math.max(0, Math.floor(params.guestIpDailyCap)),
      featureDashboardHome: params.dashboard.home ? 1 : 0,
      featureDashboardTeams: params.dashboard.teams ? 1 : 0,
      featureDashboardMarketplace: params.dashboard.marketplace ? 1 : 0,
      featureDashboardBilling: params.dashboard.billing ? 1 : 0,
      featureDashboardSettings: params.dashboard.settings ? 1 : 0,
      dashboardHomeRoute: normalizeRoute(params.dashboard.homeRoute),
      updatedAt: new Date(),
    })
    .where(eq(adminSystemSettingsTable.id, DEFAULT_ID));

  return getSystemSettings();
}
