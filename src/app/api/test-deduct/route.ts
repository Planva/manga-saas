<<<<<<< HEAD
"use server";

import { NextResponse } from "next/server";
import { headers as nextHeaders, cookies as nextCookies } from "next/headers";

import { getSessionFromCookie } from "@/utils/auth";
import { getSystemSettings } from "@/utils/system-settings";
import { updateUserCredits, hasUnlimitedAccess } from "@/utils/credits";
import { logUserEvent } from "@/utils/user-events";
import { nowSeconds } from "@/utils/time";
=======
// src/app/api/test-deduct/route.ts
import { NextResponse } from "next/server";
import { headers as nextHeaders, cookies as nextCookies } from "next/headers";
import { getSessionFromCookie } from "@/utils/auth";
import { updateUserCredits, hasUnlimitedAccess } from "@/utils/credits";

// ⬇️ 使用 Drizzle ORM，而不是 db.execute
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
import { getDB } from "@/db";
import { guestQuotaTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

<<<<<<< HEAD
type GuestQuota = {
  day: string;
  did: string;
  ip: string;
  remaining: number;
  used: number;
  ipChanges: number;
};

function dayKeyUTC(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function sha256Hex(input: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(input));
    return Array.from(new Uint8Array(buffer))
=======
/** =============== 小工具 =============== **/
function dayKeyUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function sha256Hex(s: string) {
  // @ts-ignore
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(s);
    const buf = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  const { createHash } = await import("node:crypto");
<<<<<<< HEAD
  return createHash("sha256").update(input).digest("hex");
}

async function makeDeviceId(headers: Headers, secret: string): Promise<string> {
  const ua = headers.get("user-agent") ?? "";
  const lang = headers.get("accept-language") ?? "";
  return (await sha256Hex(`device|${ua}|${lang}|${secret}`)).slice(0, 32);
}

function getClientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
=======
  return createHash("sha256").update(s).digest("hex");
}

async function signPayload(payload: string, secret: string) {
  return sha256Hex(payload + "|" + secret);
}

async function makeDeviceId(h: Headers, secret: string) {
  const ua = h.get("user-agent") || "";
  const al = h.get("accept-language") || "";
  return (await sha256Hex(`did|${ua}|${al}|${secret}`)).slice(0, 32);
}

function b64urlEncode(s: string) {
  // @ts-ignore
  if (typeof Buffer !== "undefined") return Buffer.from(s, "utf8").toString("base64url");
  // @ts-ignore
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(s: string) {
  // @ts-ignore
  if (typeof Buffer !== "undefined") return Buffer.from(s, "base64url").toString("utf8");
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  // @ts-ignore
  return atob(b64);
}

function getClientIp(h: Headers): string {
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    "0.0.0.0"
  );
}

<<<<<<< HEAD
function encodeCookiePayload(data: GuestQuota, secret: string): string {
  const payload = JSON.stringify(data);
  const signature = Buffer.from(`${payload}|${secret}`, "utf8").toString("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;
}

export async function POST(req: Request) {
  const headers = await nextHeaders();
  const cookies = await nextCookies();

  const settings = await getSystemSettings();
  const session = await getSessionFromCookie();

  const usageMode = (process.env.FEATURE_USAGE_MODE ?? "credits") as "credits" | "free";
  const cost = Math.max(0, Number(settings.perUseCreditCost ?? 1)) || 1;

  if (usageMode === "free") {
    await logUserEvent({
      eventType: "test_button_click",
      userId: session?.user?.id ? String(session.user.id) : undefined,
      email: session?.user?.email ?? null,
      metadata: { outcome: "free_mode", cost },
    });
    return NextResponse.redirect(new URL("/?test=ok&mode=free", req.url), { status: 302 });
  }

  if (session?.user?.id) {
    const userId = String(session.user.id);
    const email = session.user.email ?? null;

    if (await hasUnlimitedAccess(userId)) {
      await logUserEvent({
        eventType: "test_button_click",
        userId,
        email,
        metadata: { outcome: "unlimited", cost },
      });
      return NextResponse.redirect(new URL("/?test=ok&mode=unlimited", req.url), {
        status: 302,
      });
    }

    const result = await updateUserCredits(userId, -cost);

    let outcome: "success" | "insufficient" | "failed" | "unlimited";
    if ((result as any)?.ok) {
      outcome = "success";
    } else if ((result as any)?.error === "INSUFFICIENT_CREDITS") {
      outcome = "insufficient";
    } else {
      outcome = "failed";
    }

    await logUserEvent({
      eventType: "test_button_click",
      userId,
      email,
      metadata: { outcome, cost },
    });

    if (outcome === "success" || outcome === "unlimited") {
      return NextResponse.redirect(new URL("/?test=ok", req.url), { status: 302 });
    }

    if (outcome === "insufficient") {
      return NextResponse.redirect(new URL("/?test=insufficient", req.url), {
        status: 302,
      });
    }

    return NextResponse.redirect(new URL("/?test=insufficient", req.url), { status: 302 });
  }

  if (!settings.guestDailyFreeEnabled) {
=======
/** =============== 业务主逻辑 =============== **/
export async function POST(req: Request) {
  // Next 现在要求动态 API 等取值要先 await 再用
  const h = await nextHeaders();
  const c = await nextCookies();

  const session = await getSessionFromCookie();
  const USAGE_MODE = (process.env.FEATURE_USAGE_MODE ?? "credits") as "credits" | "free";
  const cost = Number(process.env.PER_USE_CREDIT_COST ?? "1") || 1;

  /** 0) 全站“免费模式”（按你的开关） */
  if (USAGE_MODE === "free") {
    return NextResponse.redirect(new URL("/?test=ok&mode=free", req.url), { status: 302 });
  }

  /** 1) 已登录用户：先看是否“订阅无限使用”，是的话直接放行；否则走扣分 */
  if (session?.user?.id) {
    const userId = String(session.user.id);

    // ① 先判断是否处于“无限使用期”
    if (await hasUnlimitedAccess(userId)) {
      return NextResponse.redirect(new URL("/?test=ok&mode=unlimited", req.url), { status: 302 });
    }

    // ② 否则尝试扣费（updateUserCredits 内部也会再次做无限期/余额不足的保护）
    const r = await updateUserCredits(userId, -cost);

    if ((r as any)?.ok || (r as any)?.skipped === "unlimited") {
      return NextResponse.redirect(new URL("/?test=ok", req.url), { status: 302 });
    }
    if ((r as any)?.error === "INSUFFICIENT_CREDITS") {
      return NextResponse.redirect(new URL("/?test=insufficient", req.url), { status: 302 });
    }

    // 兜底：未知情况，也记为 insufficient，便于用户侧提示
    return NextResponse.redirect(new URL("/?test=insufficient", req.url), { status: 302 });
  }

  /** 2) 未登录用户（游客）：将“每日免费额度 + 限流”持久化到 D1（Cookie 仅做快照） */
  if (process.env.FEATURE_GUEST_DAILY_FREE_ENABLED === "false") {
    // 未开游客时引导登录（保持你之前的行为）
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    return NextResponse.redirect(new URL("/sign-in?next=/", req.url), { status: 302 });
  }

  const day = dayKeyUTC();
  const secret = process.env.GUEST_COOKIE_SECRET || "dev-secret";
<<<<<<< HEAD
  const deviceId = await makeDeviceId(headers, secret);
  const ip = getClientIp(headers);

  const freePerDay =
    settings.guestDailyFreeCredits > 0
      ? settings.guestDailyFreeCredits
      : settings.dailyFreeCredits;
  const deviceDailyLimit = Math.max(0, settings.guestDeviceDailyLimit);
  const ipDailyCap = Math.max(0, settings.guestIpDailyCap);
  const ipChangeLimit = Number(process.env.GUEST_IP_CHANGES_PER_DAY_LIMIT ?? "5") || 5;

  const db = getDB();

  const logGuestEvent = async (
    outcome: string,
    extra?: Record<string, unknown>,
  ) => {
    await logUserEvent({
      eventType: "test_button_click_guest",
      metadata: { outcome, cost, ...extra },
      context: { ip, deviceId },
    });
  };

  const existing = await db
=======
  const freePerDay =
    Number(process.env.GUEST_DAILY_FREE_CREDITS ?? process.env.DAILY_FREE_CREDITS ?? "0") || 0;
  const devLimit = Number(process.env.GUEST_DEVICE_DAILY_LIMIT ?? "100") || 100;
  const ipChangesLimit = Number(process.env.GUEST_IP_CHANGES_PER_DAY_LIMIT ?? "5") || 5;
  const ipDailyCap = Number(process.env.GUEST_IP_DAILY_CAP ?? "20") || 20; // 同一 IP 的日总上限

  // 设备指纹（弱但稳定于同一浏览器）
  let did = c.get("did")?.value;
  if (!did) {
    did = await makeDeviceId(h, secret);
    c.set("did", did, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // 游客 ID（沿用）
  let gid = c.get("gid")?.value;
  if (!gid) {
    gid = crypto.randomUUID();
    c.set("gid", gid, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // IP（CF / 反代 / 本地）
  const ip = getClientIp(h);

  type GuestQuota = {
    day: string;
    did: string;
    ip: string;
    remaining: number;
    used: number;
    ipChanges: number;
  };

  // —— 核心：使用 Drizzle 访问 D1 ——
  const db = getDB();

  // 2.1 读取 (day, did)
  const row = await db
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    .select({
      day: guestQuotaTable.day,
      did: guestQuotaTable.did,
      ip: guestQuotaTable.ip,
      remaining: guestQuotaTable.remaining,
      used: guestQuotaTable.used,
      ipChanges: guestQuotaTable.ipChanges,
    })
    .from(guestQuotaTable)
<<<<<<< HEAD
    .where(and(eq(guestQuotaTable.day, day), eq(guestQuotaTable.did, deviceId)))
    .get();

  let quota: GuestQuota;

  if (!existing) {
    quota = {
      day,
      did: deviceId,
      ip,
      remaining: freePerDay,
      used: 0,
      ipChanges: 0,
    };

    try {
      await db.insert(guestQuotaTable).values({
        day: quota.day,
        did: quota.did,
        ip: quota.ip,
        remaining: quota.remaining,
        used: quota.used,
        ipChanges: quota.ipChanges,
        updatedAt: nowSeconds(),
      });
    } catch {
      // ignore race condition
    }
  } else {
    quota = {
      day: existing.day as string,
      did: existing.did as string,
      ip: (existing.ip as string) || ip,
      remaining: Number(existing.remaining ?? 0),
      used: Number(existing.used ?? 0),
      ipChanges: Number(existing.ipChanges ?? 0),
    };
  }

  if (quota.ip !== ip) {
    quota.ip = ip;
    quota.ipChanges += 1;
=======
    .where(and(eq(guestQuotaTable.day, day), eq(guestQuotaTable.did, did)))
    .get();

  let data: GuestQuota;
  if (!row) {
    data = { day, did, ip, remaining: freePerDay, used: 0, ipChanges: 0 };
    // D1 有的版本没有 onConflictDoNothing，这里就 try/catch 一次
    try {
      await db.insert(guestQuotaTable).values({
        day: data.day,
        did: data.did,
        ip: data.ip,
        remaining: data.remaining,
        used: data.used,
        ipChanges: data.ipChanges,
        updatedAt: Math.floor(Date.now() / 1000),
      });
    } catch {
      // ignore
    }
  } else {
    data = {
      day: row.day as string,
      did: row.did as string,
      ip: (row.ip as string) ?? ip,
      remaining: Number(row.remaining ?? 0),
      used: Number(row.used ?? 0),
      ipChanges: Number(row.ipChanges ?? 0),
    };
  }

  // 2.2 更换 IP 次数限制
  if (data.ip !== ip) {
    data.ip = ip;
    data.ipChanges += 1;
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2

    await db
      .update(guestQuotaTable)
      .set({
<<<<<<< HEAD
        ip: quota.ip,
        ipChanges: quota.ipChanges,
        updatedAt: nowSeconds(),
      })
      .where(and(eq(guestQuotaTable.day, day), eq(guestQuotaTable.did, deviceId)));

    if (quota.ipChanges > ipChangeLimit) {
      await logGuestEvent("rate_limited_ip_changes", { ipChanges: quota.ipChanges });
      cookies.set(`gq_${day}`, encodeCookiePayload(quota, secret), {
=======
        ip: data.ip,
        ipChanges: data.ipChanges,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(and(eq(guestQuotaTable.day, day), eq(guestQuotaTable.did, did)));

    if (data.ipChanges > ipChangesLimit) {
      // 写一个 cookie 快照（非权威）
      const payload = JSON.stringify(data);
      const sig = await signPayload(payload, secret);
      const cookieName = `gq_${day}`;
      c.set(cookieName, `${b64urlEncode(payload)}.${b64urlEncode(sig)}`, {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return NextResponse.redirect(new URL("/?test=rate_limited", req.url), { status: 302 });
    }
  }

<<<<<<< HEAD
  const ipUsage = await db
    .select({
      totalUsed: sql<number>`COALESCE(sum(${guestQuotaTable.used}), 0)`,
=======
  // 2.3 同一 IP 的日总上限（用 sql() 聚合）
  const ipAgg = await db
    .select({
      usedSum: sql<number>`COALESCE(sum(${guestQuotaTable.used}), 0)`,
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    })
    .from(guestQuotaTable)
    .where(and(eq(guestQuotaTable.day, day), eq(guestQuotaTable.ip, ip)))
    .get();

<<<<<<< HEAD
  if (Number(ipUsage?.totalUsed ?? 0) >= ipDailyCap) {
    await logGuestEvent("rate_limited_ip_total", { ipUsage: Number(ipUsage?.totalUsed ?? 0) });
    return NextResponse.redirect(new URL("/?test=rate_limited_ip", req.url), { status: 302 });
  }

  if (quota.used >= deviceDailyLimit) {
    await logGuestEvent("rate_limited_device", { used: quota.used });
    cookies.set(`gq_${day}`, encodeCookiePayload(quota, secret), {
=======
  if (Number(ipAgg?.usedSum ?? 0) >= ipDailyCap) {
    return NextResponse.redirect(new URL("/?test=rate_limited_ip", req.url), { status: 302 });
  }

  // 2.4 单设备日次限额
  if (data.used >= devLimit) {
    const payload = JSON.stringify(data);
    const sig = await signPayload(payload, secret);
    const cookieName = `gq_${day}`;
    c.set(cookieName, `${b64urlEncode(payload)}.${b64urlEncode(sig)}`, {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return NextResponse.redirect(new URL("/?test=rate_limited", req.url), { status: 302 });
  }

<<<<<<< HEAD
  if (quota.remaining < cost) {
    await logGuestEvent("insufficient_quota", { remaining: quota.remaining });
    cookies.set(`gq_${day}`, encodeCookiePayload(quota, secret), {
=======
  // 2.5 配额不足
  if (data.remaining < cost) {
    const payload = JSON.stringify(data);
    const sig = await signPayload(payload, secret);
    const cookieName = `gq_${day}`;
    c.set(cookieName, `${b64urlEncode(payload)}.${b64urlEncode(sig)}`, {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return NextResponse.redirect(new URL("/?test=guest_no_quota", req.url), { status: 302 });
  }

<<<<<<< HEAD
  quota.remaining -= cost;
  quota.used += 1;
=======
  // 2.6 扣除 + 写回 D1
  data.remaining -= cost;
  data.used += 1;
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2

  await db
    .update(guestQuotaTable)
    .set({
<<<<<<< HEAD
      remaining: quota.remaining,
      used: quota.used,
      updatedAt: nowSeconds(),
    })
    .where(and(eq(guestQuotaTable.day, day), eq(guestQuotaTable.did, deviceId)));

  cookies.set(`gq_${day}`, encodeCookiePayload(quota, secret), {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  await logGuestEvent("success", { remaining: quota.remaining });

  return NextResponse.redirect(
    new URL(`/?test=guest_ok&remain=${quota.remaining}`, req.url),
    { status: 302 },
  );
}




=======
      remaining: data.remaining,
      used: data.used,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(and(eq(guestQuotaTable.day, day), eq(guestQuotaTable.did, did)));

  // 同步一份 cookie “快照”（非权威）
  {
    const payload = JSON.stringify(data);
    const sig = await signPayload(payload, secret);
    const cookieName = `gq_${day}`;
    c.set(cookieName, `${b64urlEncode(payload)}.${b64urlEncode(sig)}`, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  return NextResponse.redirect(
    new URL(`/?test=guest_ok&remain=${data.remaining}`, req.url),
    { status: 302 },
  );
}
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
