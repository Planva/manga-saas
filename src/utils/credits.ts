<<<<<<< HEAD
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
=======
// src/utils/credits.ts
import "server-only";
import { eq } from "drizzle-orm";
import { getDB } from "@/db";
import { userTable, creditTransactionTable, purchasedItemsTable } from "@/db/schema";
import { updateAllSessionsOfUser, type KVSession } from "./kv-session";
import { desc, sql } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";

/* ------------------------- 小工具 ------------------------- */

function nowSec() {
  return Math.floor(Date.now() / 1000);
}
function toSec(v: unknown): number {
  if (!v) return 0;
  if (v instanceof Date) return Math.floor(v.getTime() / 1000);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function subsMode() {
  const m = (process.env.FEATURE_SUBS_UNLIMITED_MODE ?? "off").toLowerCase();
  return (["off", "monthly", "yearly", "all"] as const).includes(m as any)
    ? (m as "off" | "monthly" | "yearly" | "all")
    : "off";
}
const SUB_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_SUB_MONTHLY || "";
const SUB_YEARLY  = process.env.NEXT_PUBLIC_STRIPE_SUB_YEARLY  || "";

/* ------------------------- 订阅判定（仅用邮箱，自愈写回 until） ------------------------- */

/**
 * 仅用邮箱到 Stripe 查找订阅；命中后把 current_period_end 写回 unlimitedUsageUntil。
 * 不再依赖/写入 stripeCustomerId（你的 schema 中没有该列）。
 */
async function ensureUnlimitedByStripe(userId: string): Promise<boolean> {
  const mode = subsMode();
  if (mode === "off") return false;

  const db = getDB();
  const u = await db
    .select({
      id: userTable.id,
      email: userTable.email,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();

  const email = (u as any)?.email as string | undefined;
  if (!email) return false;

  const stripe = getStripe();

  try {
    // 1) 用邮箱找 customer
    const list = await stripe.customers.list({ email, limit: 1 });
    const customer = list.data?.[0];
    if (!customer?.id) {
      // 没找到客户 → 清零 until（防止残留）
      await db
        .update(userTable)
        .set({ unlimitedUsageUntil: 0, updatedAt: new Date() })
        .where(eq(userTable.id, userId));
      return false;
    }

    // 2) 取 active 订阅并比对 priceId
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 20,
      expand: ["data.items.data.price"],
    });

    const allowMonthly = mode === "all" || mode === "monthly";
    const allowYearly  = mode === "all" || mode === "yearly";

    const match = subs.data.find((s) =>
      s.items.data.some((it) => {
        const pid = it.price?.id || "";
        if (!pid) return false;
        if (allowMonthly && pid === SUB_MONTHLY) return true;
        if (allowYearly  && pid === SUB_YEARLY)  return true;
        return false;
      })
    );

    const until = match?.current_period_end ?? 0;

    // 3) 写回 until（命中则周期末，否则清零）
    await db
      .update(userTable)
      .set({
        unlimitedUsageUntil: until ? until : 0,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId));

    return until > nowSec();
  } catch {
    // Stripe 临时失败不影响请求
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    return false;
  }
}

<<<<<<< HEAD
export async function hasUnlimitedAccess(userId: string): Promise<boolean> {
  const settings = await getSystemSettings();
  const db = getDB();
  const row = await db
    .select({ until: userTable.unlimitedUsageUntil })
=======
/** 统一导出：是否拥有无限使用权 */
export async function hasUnlimitedAccess(userId: string): Promise<boolean> {
  const db = getDB();
  const r = await db
    .select({ u: userTable.unlimitedUsageUntil })
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();

<<<<<<< HEAD
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
=======
  const active = toSec(r?.u) >= nowSec();
  if (active) return true;
  // 不活跃时再去 Stripe 自愈一次（只查一次，之后都走本地字段）
  return ensureUnlimitedByStripe(userId);
}

// === Back-compat for legacy marketplace purchase.action.ts ===

/**
 * 判断积分是否足够。处于“无限使用期”也视为足够。
 */
export async function hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
  // 无限订阅直接放行
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
  if (await hasUnlimitedAccess(userId)) return true;

  const db = getDB();
  const row = await db
<<<<<<< HEAD
    .select({ credits: userTable.currentCredits })
=======
    .select({ c: userTable.currentCredits })
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();

<<<<<<< HEAD
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
=======
  const current = Number(row?.c ?? 0);
  return current >= Math.max(0, Number(amount || 0));
}

/**
 * 消耗积分。内部调用统一入口 updateUserCredits。
 * 兼容老签名：consumeCredits(userId, amount, opts?)
 */
export async function consumeCredits(
  userId: string,
  amount: number,
  _opts?: {
    description?: string;
    type?: string;
    paymentIntentId?: string;
    expirationDate?: Date | null;
  }
) {
  const amt = Math.abs(Number(amount || 0));
  // updateUserCredits 自带“无限订阅跳过”和“余额不足保护”
  return updateUserCredits(userId, -amt);
}

/* ------------------------- 交易记录 ------------------------- */

async function logCreditTransaction(
  db: ReturnType<typeof getDB>,
  args: {
    userId: string;
    amount: number;                    // 正数=增加，负数=扣除
    remainingAmount: number;           // 变更后的余额
    type?: string;                     // 默认 'USAGE'
    description?: string | null;       // 备注
    paymentIntentId?: string | null;   // 可选
    expirationDate?: Date | null;      // 可选
  }
) {
  await db.insert(creditTransactionTable).values({
    userId: args.userId,
    amount: args.amount,
    remainingAmount: args.remainingAmount,
    type: args.type ?? "USAGE",
    description: args.description ?? null,
    paymentIntentId: args.paymentIntentId ?? null,
    expirationDate: args.expirationDate ?? null,
  });
}

/* ------------------------- 加/扣积分（统一入口） ------------------------- */

export async function updateUserCredits(userId: string, creditsToAdd: number) {
  const db = getDB();

  // 扣分且拥有无限订阅 → 跳过扣费
  if (creditsToAdd < 0 && (await hasUnlimitedAccess(userId))) {
    try { await updateAllSessionsOfUser(userId); } catch {}
    return { ok: true as const, skipped: "unlimited" as const };
  }

  // 扣分安全校验，避免负数
  if (creditsToAdd < 0) {
    const r = await db
      .select({ c: userTable.currentCredits })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .get();
    const cur = (r?.c ?? 0) as number;
    if (cur + creditsToAdd < 0) {
      return { ok: false as const, error: "INSUFFICIENT_CREDITS" as const };
    }
  }

  // 读 → 算 → 写
  const r2 = await db
    .select({ c: userTable.currentCredits })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();

  const current = (r2?.c ?? 0) as number;
  const next = current + creditsToAdd;

  await db
    .update(userTable)
    .set({ currentCredits: next, updatedAt: new Date() })
    .where(eq(userTable.id, userId));

  if (creditsToAdd !== 0) {
    await logCreditTransaction(db, {
      userId,
      amount: creditsToAdd,
      remainingAmount: next,
      type: creditsToAdd < 0 ? "USAGE" : "ADJUSTMENT",
      description: creditsToAdd < 0 ? "Test usage" : "Credit adjustment",
    });
  }

  try { await updateAllSessionsOfUser(userId); } catch {}

  return { ok: true as const };
}

/* ------------------------- 每日赠送（保持函数名不变） ------------------------- */

export async function addFreeMonthlyCreditsIfNeeded(session: KVSession): Promise<number> {
  const db = getDB();
  const userId = String(session.user.id);

  // 关闭每日赠送功能 → 返回当前余额
  if (process.env.FEATURE_DAILY_FREE_CREDITS_ENABLED === "false") {
    const r0 = await db
      .select({ c: userTable.currentCredits })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .get();
    return (r0?.c ?? 0) as number;
  }

  // 每日额度
  const dailyAmount = Number(process.env.DAILY_FREE_CREDITS ?? "0") || 0;
  if (dailyAmount <= 0) {
    const r0 = await db
      .select({ c: userTable.currentCredits })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .get();
    return (r0?.c ?? 0) as number;
  }

  // 是否启用“跨日清空未用赠送积分”
  const resetEnabled =
    String(process.env.DAILY_FREE_RESET ?? "").toLowerCase() === "true";

  // 读取用户当前余额与上次刷新时间
  const u = await db
    .select({
      c: userTable.currentCredits,
      lastAt: userTable.lastCreditRefreshAt,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get();

  const current = Number(u?.c ?? 0);
  const lastAt = u?.lastAt ? new Date(Number(u.lastAt)) : undefined;

  // 以 UTC 自然日判断是否“新的一天”
  const now = new Date();
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isNewDay = !lastAt || (new Date(lastAt) < startOfTodayUTC);

  if (!isNewDay) {
    return current;
  }

  let newBalance = current;

  if (resetEnabled) {
    // 计算必须保留的“非赠送净额” = 非赠送的正向总额 - USAGE 负向总额
    // 非赠送正向：排除 MONTHLY_REFRESH
    const posNonFreeRow = await db
      .select({
        s: sql<number>`COALESCE(SUM(CASE WHEN ${creditTransactionTable.type} != 'MONTHLY_REFRESH' AND ${creditTransactionTable.amount} > 0 THEN ${creditTransactionTable.amount} ELSE 0 END), 0)`.as("s"),
      })
      .from(creditTransactionTable)
      .where(eq(creditTransactionTable.userId, userId))
      .get();

    const negUsageRow = await db
      .select({
        s: sql<number>`COALESCE(SUM(CASE WHEN ${creditTransactionTable.type} = 'USAGE' AND ${creditTransactionTable.amount} < 0 THEN -${creditTransactionTable.amount} ELSE 0 END), 0)`.as("s"),
      })
      .from(creditTransactionTable)
      .where(eq(creditTransactionTable.userId, userId))
      .get();

    const posNonFree = Number(posNonFreeRow?.s ?? 0);
    const usedNeg = Number(negUsageRow?.s ?? 0);
    const mustKeep = Math.max(0, posNonFree - usedNeg);          // 付费/非赠送净额
    const freebiesLeft = Math.max(0, current - mustKeep);         // 尚未花掉的“赠送池”

    if (freebiesLeft > 0) {
      newBalance = current - freebiesLeft;

      // 记录一次“清空赠送池”的交易（类型 DAILY_RESET）
      await logCreditTransaction(db, {
        userId,
        amount: -freebiesLeft,
        remainingAmount: newBalance,
        type: "DAILY_RESET",
        description: "Reset leftover daily free credits",
      });
    }
  }

  // 发放今日的赠送额度
  newBalance = newBalance + dailyAmount;

  // 记录发放交易（沿用模板已有的 MONTHLY_REFRESH 类型）
  await logCreditTransaction(db, {
    userId,
    amount: dailyAmount,
    remainingAmount: newBalance,
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    type: "MONTHLY_REFRESH",
    description: "Daily free credits",
  });

<<<<<<< HEAD
  try {
    await updateAllSessionsOfUser(session.user.id);
  } catch (error) {
    console.error("[credits] refresh sessions after daily grant failed", error);
  }

  return balance;
}

=======
  // 写回余额与“上次刷新时间”
  await db
    .update(userTable)
    .set({
      currentCredits: newBalance,
      lastCreditRefreshAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  try {
    await updateAllSessionsOfUser(userId);
  } catch {}

  return newBalance;
}


/* ------------------------- 交易列表（保持原导出） ------------------------- */

>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
export async function getCreditTransactions(args: {
  userId: string;
  page?: number;
  limit?: number;
<<<<<<< HEAD
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
=======
  [k: string]: any;
}) {
  const db = getDB();
  const page = Math.max(1, Number(args.page ?? 1));
  const limit = Math.max(1, Number(args.limit ?? 10));
  const offset = (page - 1) * limit;

  const totalRow = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(creditTransactionTable)
    .where(eq(creditTransactionTable.userId, args.userId))
    .get();
  const total = Number(totalRow?.count ?? 0);

  const baseSel = db
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
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

<<<<<<< HEAD
  const rows =
    (await baseQuery.offset?.(offset)?.all?.()) ??
    (await baseQuery.offset?.(offset)?.execute?.()) ??
    (await baseQuery.all?.()) ??
    (await baseQuery.execute?.()) ??
    [];

  const total = Number(totalRow?.count ?? 0);
  const pages = Math.max(1, Math.ceil(total / limit));

=======
  // drizzle d1 版本差异：all/execute/offset 兼容
  // @ts-ignore
  const rows =
    (await baseSel.offset?.(offset)?.all?.()) ??
    // @ts-ignore
    (await baseSel.offset?.(offset)?.execute?.()) ??
    // @ts-ignore
    (await baseSel.all?.()) ??
    // @ts-ignore
    (await baseSel.execute?.()) ??
    [];

>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
  return {
    transactions: rows,
    pagination: {
      total,
<<<<<<< HEAD
      pages,
=======
      pages: Math.max(1, Math.ceil(total / limit)),
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      current: page,
      limit,
    },
  };
}

export async function getCreditTransactionsCount(userId: string) {
  const db = getDB();
<<<<<<< HEAD
  const row = await db
    .select({ count: sql<number>`count(*)` })
    .from(creditTransactionTable)
    .where(eq(creditTransactionTable.userId, userId))
    .get();
  return Number(row?.count ?? 0);
=======
  const r = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(creditTransactionTable)
    .where(eq(creditTransactionTable.userId, userId))
    .get();
  return Number(r?.count ?? 0);
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
}

export async function getUserPurchasedItems(userId: string): Promise<Set<string>> {
  const db = getDB();
<<<<<<< HEAD
  const query = db
    .select({ itemId: purchasedItemsTable.itemId })
    .from(purchasedItemsTable)
    .where(eq(purchasedItemsTable.userId, userId));

  const rows =
    (await query.all?.()) ??
    (await query.execute?.()) ??
    [];
  return new Set(rows.map((row: { itemId: string }) => row.itemId));
=======
  // @ts-ignore
  const q = db
    .select({ itemId: purchasedItemsTable.itemId })
    .from(purchasedItemsTable)
    .where(eq(purchasedItemsTable.userId, userId));
  // @ts-ignore
  const rows = (await q.all?.()) ?? (await q.execute?.()) ?? [];
  return new Set(rows.map((r: any) => r.itemId));
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
}
