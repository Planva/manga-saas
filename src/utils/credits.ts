"use server";

import "server-only";

import { eq, desc, sql } from "drizzle-orm";

import { getDB } from "@/db";
import {
  creditTransactionTable,
  purchasedItemsTable,
  userTable,
} from "@/db/schema";
import { updateAllSessionsOfUser, type KVSession } from "./kv-session";
import { getStripe } from "@/lib/stripe";
import { getSystemSettings, type SystemSettings } from "@/utils/system-settings";
import { nowSeconds, toSeconds } from "@/utils/time";

const CREDIT_TRANSACTION_DEFAULT_TYPE = "USAGE";

function matchesUnlimitedPrice(
  priceId: string | undefined,
  settings: SystemSettings,
): boolean {
  if (!priceId) return false;
  const { subsUnlimitedMode, stripePrices } = settings;
  if (subsUnlimitedMode === "off") return false;

  const monthlyId = stripePrices.subMonthly ?? "";
  const yearlyId = stripePrices.subYearly ?? "";

  if (subsUnlimitedMode === "all") {
    return Boolean(
      (monthlyId && priceId === monthlyId) ||
        (yearlyId && priceId === yearlyId),
    );
  }

  if (subsUnlimitedMode === "monthly") {
    return Boolean(monthlyId && priceId === monthlyId);
  }

  if (subsUnlimitedMode === "yearly") {
    return Boolean(yearlyId && priceId === yearlyId);
  }

  return false;
}

async function fetchUserEmail(userId: string): Promise<string | null> {
  const db = getDB();
  const row = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();
  return row?.email ?? null;
}

async function writeUnlimitedUntil(userId: string, untilSeconds: number): Promise<void> {
  const db = getDB();
  await db
    .update(userTable)
    .set({
      unlimitedUsageUntil: untilSeconds,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));
}

async function ensureUnlimitedAccessFromStripe(
  userId: string,
  settings: SystemSettings,
): Promise<boolean> {
  const email = await fetchUserEmail(userId);
  if (!email) return false;

  if (settings.subsUnlimitedMode === "off") {
    await writeUnlimitedUntil(userId, 0);
    return false;
  }

  const stripe = getStripe();

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data?.[0];
    if (!customer?.id) {
      await writeUnlimitedUntil(userId, 0);
      return false;
    }

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      expand: ["data.items.data.price"],
      limit: 20,
    });

    const match = subs.data.find((subscription) =>
      subscription.items.data.some((item) =>
        matchesUnlimitedPrice(item.price?.id, settings),
      ),
    );

    const until = match?.current_period_end ?? 0;
    await writeUnlimitedUntil(userId, until);
    return until > nowSeconds();
  } catch (error) {
    console.error("[credits] ensureUnlimitedAccessFromStripe failed", error);
    return false;
  }
}

export async function hasUnlimitedAccess(userId: string): Promise<boolean> {
  const settings = await getSystemSettings();
  const db = getDB();
  const row = await db
    .select({ until: userTable.unlimitedUsageUntil })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();

  const active = toSeconds(row?.until) >= nowSeconds();
  if (active) return true;

  return ensureUnlimitedAccessFromStripe(userId, settings);
}

type ConsumeCreditsLegacyOptions = {
  description?: string;
  type?: string;
  paymentIntentId?: string;
  expirationDate?: Date | null;
};

type ConsumeCreditsObject = {
  userId: string;
  amount: number;
  description?: string;
  type?: string;
  paymentIntentId?: string;
  expirationDate?: Date | null;
};

export async function consumeCredits(
  userOrOptions: string | ConsumeCreditsObject,
  maybeAmount?: number,
  legacyOptions?: ConsumeCreditsLegacyOptions,
) {
  if (typeof userOrOptions === "string") {
    const value = Math.max(0, Math.abs(Number(maybeAmount ?? 0)));
    return updateUserCredits(userOrOptions, -value, legacyOptions);
  }

  const value = Math.max(0, Math.abs(Number(userOrOptions.amount ?? 0)));
  return updateUserCredits(userOrOptions.userId, -value, {
    description: userOrOptions.description ?? null,
    type: userOrOptions.type,
    paymentIntentId: userOrOptions.paymentIntentId ?? null,
    expirationDate: userOrOptions.expirationDate ?? null,
  });
}

async function logCreditTransaction(entry: {
  userId: string;
  amount: number;
  remainingAmount: number;
  type?: string;
  description?: string | null;
  paymentIntentId?: string | null;
  expirationDate?: Date | null;
}): Promise<void> {
  const db = getDB();
  await db.insert(creditTransactionTable).values({
    userId: entry.userId,
    amount: entry.amount,
    remainingAmount: entry.remainingAmount,
    type: entry.type ?? CREDIT_TRANSACTION_DEFAULT_TYPE,
    description: entry.description ?? "",
    paymentIntentId: entry.paymentIntentId ?? null,
    expirationDate: entry.expirationDate ?? null,
  });
}

export async function updateUserCredits(
  userId: string,
  creditsToAdd: number,
  options?: {
    type?: string;
    description?: string | null;
    paymentIntentId?: string | null;
    expirationDate?: Date | null;
  },
) {
  const db = getDB();
  const delta = Number(creditsToAdd);

  if (delta < 0 && (await hasUnlimitedAccess(userId))) {
    try {
      await updateAllSessionsOfUser(userId);
    } catch (error) {
      console.error("[credits] refresh session after unlimited skip failed", error);
    }
    return { ok: true as const, skipped: "unlimited" as const };
  }

  const currentRow = await db
    .select({ credits: userTable.currentCredits })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();
  const currentCredits = Number(currentRow?.credits ?? 0);

  if (delta < 0 && currentCredits + delta < 0) {
    return { ok: false as const, error: "INSUFFICIENT_CREDITS" as const };
  }

  const newBalance = currentCredits + delta;

  await db
    .update(userTable)
    .set({
      currentCredits: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  await logCreditTransaction({
    userId,
    amount: delta,
    remainingAmount: newBalance,
    type: options?.type,
    description: options?.description ?? null,
    paymentIntentId: options?.paymentIntentId ?? null,
    expirationDate: options?.expirationDate ?? null,
  });

  try {
    await updateAllSessionsOfUser(userId);
  } catch (error) {
    console.error("[credits] refresh sessions failed", error);
  }

  return { ok: true as const, balance: newBalance };
}

export async function hasEnoughCredits(
  userId: string,
  amount: number,
): Promise<boolean> {
  if (await hasUnlimitedAccess(userId)) return true;

  const db = getDB();
  const row = await db
    .select({ credits: userTable.currentCredits })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();

  const current = Number(row?.credits ?? 0);
  return current >= Math.max(0, Number(amount ?? 0));
}

export async function addFreeMonthlyCreditsIfNeeded(
  session: KVSession,
): Promise<number> {
  const settings = await getSystemSettings();
  if (!settings.dailyFreeCreditsEnabled) {
    const db = getDB();
    const row = await db
      .select({ credits: userTable.currentCredits })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .get();
    return Number(row?.credits ?? 0);
  }

  const dailyAmount = Math.max(0, settings.dailyFreeCredits);
  if (dailyAmount <= 0) {
    const db = getDB();
    const row = await db
      .select({ credits: userTable.currentCredits })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .get();
    return Number(row?.credits ?? 0);
  }

  const db = getDB();
  const row = await db
    .select({
      credits: userTable.currentCredits,
      lastRefreshAt: userTable.lastCreditRefreshAt,
    })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .get();

  const current = Number(row?.credits ?? 0);
  const lastRefreshSeconds = toSeconds(row?.lastRefreshAt);
  const now = nowSeconds();

  const sameDay =
    lastRefreshSeconds > 0 &&
    new Date(lastRefreshSeconds * 1000).getUTCDate() === new Date(now * 1000).getUTCDate();

  if (sameDay) {
    return current;
  }

  let balance = current;

  if (settings.dailyFreeReset && balance > 0) {
    await logCreditTransaction({
      userId: session.user.id,
      amount: -balance,
      remainingAmount: 0,
      type: "DAILY_RESET",
      description: "Reset leftover daily free credits",
    });
    balance = 0;
  }

  balance += dailyAmount;

  await db
    .update(userTable)
    .set({
      currentCredits: balance,
      lastCreditRefreshAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, session.user.id));

  await logCreditTransaction({
    userId: session.user.id,
    amount: dailyAmount,
    remainingAmount: balance,
    type: "MONTHLY_REFRESH",
    description: "Daily free credits",
  });

  try {
    await updateAllSessionsOfUser(session.user.id);
  } catch (error) {
    console.error("[credits] refresh sessions after daily grant failed", error);
  }

  return balance;
}

export async function getCreditTransactions(args: {
  userId: string;
  page?: number;
  limit?: number;
}) {
  const db = getDB();
  const page = Math.max(1, Number(args.page ?? 1));
  const limit = Math.max(1, Math.min(100, Number(args.limit ?? 10)));
  const offset = (page - 1) * limit;

  const totalRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(creditTransactionTable)
    .where(eq(creditTransactionTable.userId, args.userId))
    .get();

  const baseQuery = db
    .select({
      id: creditTransactionTable.id,
      amount: creditTransactionTable.amount,
      remainingAmount: creditTransactionTable.remainingAmount,
      type: creditTransactionTable.type,
      description: creditTransactionTable.description,
      createdAt: creditTransactionTable.createdAt,
      expirationDate: creditTransactionTable.expirationDate,
      paymentIntentId: creditTransactionTable.paymentIntentId,
    })
    .from(creditTransactionTable)
    .where(eq(creditTransactionTable.userId, args.userId))
    .orderBy(desc(creditTransactionTable.createdAt))
    .limit(limit);

  const rows =
    (await baseQuery.offset?.(offset)?.all?.()) ??
    (await baseQuery.offset?.(offset)?.execute?.()) ??
    (await baseQuery.all?.()) ??
    (await baseQuery.execute?.()) ??
    [];

  const total = Number(totalRow?.count ?? 0);
  const pages = Math.max(1, Math.ceil(total / limit));

  return {
    transactions: rows,
    pagination: {
      total,
      pages,
      current: page,
      limit,
    },
  };
}

export async function getCreditTransactionsCount(userId: string) {
  const db = getDB();
  const row = await db
    .select({ count: sql<number>`count(*)` })
    .from(creditTransactionTable)
    .where(eq(creditTransactionTable.userId, userId))
    .get();
  return Number(row?.count ?? 0);
}

export async function getUserPurchasedItems(userId: string): Promise<Set<string>> {
  const db = getDB();
  const query = db
    .select({ itemId: purchasedItemsTable.itemId })
    .from(purchasedItemsTable)
    .where(eq(purchasedItemsTable.userId, userId));

  const rows =
    (await query.all?.()) ??
    (await query.execute?.()) ??
    [];
  return new Set(rows.map((row: { itemId: string }) => row.itemId));
}
