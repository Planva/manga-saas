"use server";

import { NextResponse } from "next/server";
import { headers as nextHeaders, cookies as nextCookies } from "next/headers";

import { getSessionFromCookie } from "@/utils/auth";
import { getSystemSettings } from "@/utils/system-settings";
import { updateUserCredits, hasUnlimitedAccess } from "@/utils/credits";
import { logUserEvent } from "@/utils/user-events";
import { nowSeconds } from "@/utils/time";
import { getDB } from "@/db";
import { guestQuotaTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

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
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  const { createHash } = await import("node:crypto");
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
    "0.0.0.0"
  );
}

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
    return NextResponse.redirect(new URL("/sign-in?next=/", req.url), { status: 302 });
  }

  const day = dayKeyUTC();
  const secret = process.env.GUEST_COOKIE_SECRET || "dev-secret";
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
    .select({
      day: guestQuotaTable.day,
      did: guestQuotaTable.did,
      ip: guestQuotaTable.ip,
      remaining: guestQuotaTable.remaining,
      used: guestQuotaTable.used,
      ipChanges: guestQuotaTable.ipChanges,
    })
    .from(guestQuotaTable)
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

    await db
      .update(guestQuotaTable)
      .set({
        ip: quota.ip,
        ipChanges: quota.ipChanges,
        updatedAt: nowSeconds(),
      })
      .where(and(eq(guestQuotaTable.day, day), eq(guestQuotaTable.did, deviceId)));

    if (quota.ipChanges > ipChangeLimit) {
      await logGuestEvent("rate_limited_ip_changes", { ipChanges: quota.ipChanges });
      cookies.set(`gq_${day}`, encodeCookiePayload(quota, secret), {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return NextResponse.redirect(new URL("/?test=rate_limited", req.url), { status: 302 });
    }
  }

  const ipUsage = await db
    .select({
      totalUsed: sql<number>`COALESCE(sum(${guestQuotaTable.used}), 0)`,
    })
    .from(guestQuotaTable)
    .where(and(eq(guestQuotaTable.day, day), eq(guestQuotaTable.ip, ip)))
    .get();

  if (Number(ipUsage?.totalUsed ?? 0) >= ipDailyCap) {
    await logGuestEvent("rate_limited_ip_total", { ipUsage: Number(ipUsage?.totalUsed ?? 0) });
    return NextResponse.redirect(new URL("/?test=rate_limited_ip", req.url), { status: 302 });
  }

  if (quota.used >= deviceDailyLimit) {
    await logGuestEvent("rate_limited_device", { used: quota.used });
    cookies.set(`gq_${day}`, encodeCookiePayload(quota, secret), {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return NextResponse.redirect(new URL("/?test=rate_limited", req.url), { status: 302 });
  }

  if (quota.remaining < cost) {
    await logGuestEvent("insufficient_quota", { remaining: quota.remaining });
    cookies.set(`gq_${day}`, encodeCookiePayload(quota, secret), {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return NextResponse.redirect(new URL("/?test=guest_no_quota", req.url), { status: 302 });
  }

  quota.remaining -= cost;
  quota.used += 1;

  await db
    .update(guestQuotaTable)
    .set({
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




