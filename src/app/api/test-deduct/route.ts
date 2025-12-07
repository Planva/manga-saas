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
  const wantsJson =
    new URL(req.url).searchParams.get("format") === "json" ||
    (req.headers.get("accept") ?? "").includes("application/json");

  const origin = req.headers.get("origin");

  const corsHeaders = new Headers();
  corsHeaders.set("Access-Control-Allow-Headers", "Content-Type, Cookie, Authorization");
  corsHeaders.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  // Always echo requesting origin; extensions need explicit origin (no *)
  if (origin) {
    corsHeaders.set("Access-Control-Allow-Origin", origin);
    corsHeaders.set("Access-Control-Allow-Credentials", "true");
    corsHeaders.set("Vary", "Origin");
  } else {
    corsHeaders.set("Access-Control-Allow-Origin", "*");
  }

  const respond = (
    payload: Record<string, unknown>,
    redirectPath = "/",
    status = 302,
  ) => {
    if (wantsJson) {
      return NextResponse.json(payload, { status: 200, headers: corsHeaders });
    }
    return NextResponse.redirect(new URL(redirectPath, req.url), {
      status,
      headers: corsHeaders,
    });
  };

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

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
    return respond({ status: "ok", mode: "free", cost }, "/?test=ok&mode=free");
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
      return respond(
        { status: "ok", mode: "unlimited", cost },
        "/?test=ok&mode=unlimited",
      );
    }

    const result = await updateUserCredits(userId, -cost);

    let outcome: "success" | "insufficient" | "failed" | "unlimited";
    if (result && typeof result === "object" && "ok" in result && result.ok) {
      outcome = "success";
    } else if (result && typeof result === "object" && "error" in result && result.error === "INSUFFICIENT_CREDITS") {
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
      return respond({ status: "ok", cost }, "/?test=ok");
    }

    if (outcome === "insufficient") {
      return respond({ status: "insufficient", cost }, "/?test=insufficient");
    }

    return respond({ status: "failed", cost }, "/?test=insufficient");
  }

  if (!settings.guestDailyFreeEnabled) {
    return respond({ status: "auth_required" }, "/sign-in?next=/");
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
      return respond(
        { status: "rate_limited_ip_changes", cost, remaining: quota.remaining },
        "/?test=rate_limited",
      );
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
    return respond(
      { status: "rate_limited_ip_total", cost, ipUsage: Number(ipUsage?.totalUsed ?? 0) },
      "/?test=rate_limited_ip",
    );
  }

  if (quota.used >= deviceDailyLimit) {
    await logGuestEvent("rate_limited_device", { used: quota.used });
    cookies.set(`gq_${day}`, encodeCookiePayload(quota, secret), {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return respond(
      { status: "rate_limited_device", cost, used: quota.used },
      "/?test=rate_limited",
    );
  }

  if (quota.remaining < cost) {
    await logGuestEvent("insufficient_quota", { remaining: quota.remaining });
    cookies.set(`gq_${day}`, encodeCookiePayload(quota, secret), {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return respond(
      { status: "guest_no_quota", cost, remaining: quota.remaining },
      "/?test=guest_no_quota",
    );
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

  return respond(
    { status: "guest_ok", remaining: quota.remaining, cost },
    `/?test=guest_ok&remain=${quota.remaining}`,
  );
}
