<<<<<<< HEAD
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/sign-in", "/dashboard", "/dashboard/:path*"],
};

type DashboardFlags = {
  home: boolean;
  teams: boolean;
  marketplace: boolean;
  billing: boolean;
  settings: boolean;
  homeRoute: string;
};

const envFlags: DashboardFlags = {
  home: boolFromEnv(process.env.FEATURE_DASHBOARD_HOME, true),
  teams: boolFromEnv(process.env.FEATURE_DASHBOARD_TEAMS, true),
  marketplace: boolFromEnv(process.env.FEATURE_DASHBOARD_MARKETPLACE, true),
  billing: boolFromEnv(process.env.FEATURE_DASHBOARD_BILLING, true),
  settings: boolFromEnv(process.env.FEATURE_DASHBOARD_SETTINGS, true),
  homeRoute: normalizeLanding(process.env.DASHBOARD_HOME_ROUTE),
};

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(normalized);
}

function normalizeLanding(raw?: string): string {
=======
// src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { FEATURES } from "@/config/features";

// ✅ 增加 sign-in，使回跳页也走域名收敛 + no-store
export const config = { matcher: ["/sign-in", "/dashboard", "/dashboard/:path*"] };

// 规范化落地路由（保持你原逻辑）
function normalizeLanding(raw?: string) {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
  const v = (raw ?? "/dashboard/billing").trim();
  return v.startsWith("/") ? v : `/${v.replace(/^\/+/, "")}`;
}

<<<<<<< HEAD
async function fetchDashboardFlags(req: NextRequest): Promise<DashboardFlags | null> {
  try {
    const url = req.nextUrl.clone();
    url.pathname = "/api/system-settings/flags";
    url.search = "";

    const response = await fetch(url, {
      headers: {
        "x-middleware-fetch": "dashboard-flags",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }

    const json = (await response.json()) as {
      dashboard?: {
        home: boolean;
        teams: boolean;
        marketplace: boolean;
        billing: boolean;
        settings: boolean;
        homeRoute: string;
      };
    } | null;

    if (!json?.dashboard) return null;

    return {
      home: Boolean(json.dashboard.home),
      teams: Boolean(json.dashboard.teams),
      marketplace: Boolean(json.dashboard.marketplace),
      billing: Boolean(json.dashboard.billing),
      settings: Boolean(json.dashboard.settings),
      homeRoute: normalizeLanding(json.dashboard.homeRoute),
    };
  } catch (error) {
    console.error("[middleware] failed to fetch dashboard flags", error);
    return null;
  }
}

function withCanonicalHost(req: NextRequest): NextResponse | null {
  const url = new URL(req.url);
  const wanted = (process.env.NEXT_PUBLIC_SITE_URL ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  if (!wanted) return null;

  if (url.host !== wanted) {
=======
function isAllowed(pathname: string) {
  if (pathname === "/dashboard") return FEATURES.HOME;
  if (pathname.startsWith("/dashboard/teams")) return FEATURES.TEAMS;
  if (pathname.startsWith("/dashboard/marketplace")) return FEATURES.MARKETPLACE;
  if (pathname.startsWith("/dashboard/billing")) return FEATURES.BILLING;
  if (pathname.startsWith("/dashboard/settings")) return FEATURES.SETTINGS;
  return true;
}

function firstEnabledLanding(): string | null {
  if (FEATURES.BILLING) return "/dashboard/billing";
  if (FEATURES.SETTINGS) return "/dashboard/settings";
  if (FEATURES.TEAMS) return "/dashboard/teams";
  if (FEATURES.MARKETPLACE) return "/dashboard/marketplace";
  return null;
}

// ✅ 新增：域名收敛（把 www. 重定向到 apex 或与你 NEXT_PUBLIC_SITE_URL 一致）
function withCanonicalHost(req: NextRequest): NextResponse | null {
  const url = new URL(req.url);
  const wanted = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!wanted) return null;

  const curr = url.host;
  if (curr !== wanted) {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
    url.host = wanted;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
<<<<<<< HEAD

  return null;
}

=======
  return null;
}

// ✅ 保留：仅对 HTML/RSC 加 no-store，避免旧 chunk
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
function withNoStore(req: NextRequest, res: NextResponse) {
  if (req.method !== "GET") return res;
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html") || accept.includes("text/x-component")) {
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

<<<<<<< HEAD
function isAllowed(pathname: string, flags: DashboardFlags): boolean {
  if (pathname === "/dashboard") return flags.home;
  if (pathname.startsWith("/dashboard/teams")) return flags.teams;
  if (pathname.startsWith("/dashboard/marketplace")) return flags.marketplace;
  if (pathname.startsWith("/dashboard/billing")) return flags.billing;
  if (pathname.startsWith("/dashboard/settings")) return flags.settings;
  return true;
}

function firstEnabledLanding(flags: DashboardFlags): string | null {
  if (flags.billing) return "/dashboard/billing";
  if (flags.settings) return "/dashboard/settings";
  if (flags.teams) return "/dashboard/teams";
  if (flags.marketplace) return "/dashboard/marketplace";
  if (flags.home) return "/dashboard";
  return null;
}

export async function middleware(req: NextRequest) {
  const canonical = withCanonicalHost(req);
  if (canonical) return canonical;

  const fetched = await fetchDashboardFlags(req);
  const flags = fetched ?? envFlags;
  const landing = fetched?.homeRoute ?? envFlags.homeRoute;
=======
export function middleware(req: NextRequest) {
  // 先做域名收敛（含 /sign-in 与 /dashboard*）
  const canon = withCanonicalHost(req);
  if (canon) return canon;
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2

  const { pathname } = req.nextUrl;

  if (pathname === "/dashboard") {
<<<<<<< HEAD
    if (!flags.home) {
      const preferred = isAllowed(landing, flags) ? landing : firstEnabledLanding(flags);
      if (preferred) {
        return withNoStore(req, NextResponse.redirect(new URL(preferred, req.url)));
      }
=======
    if (FEATURES.HOME === false) {
      const envLanding = normalizeLanding(process.env.DASHBOARD_HOME_ROUTE);
      const target = isAllowed(envLanding) ? envLanding : firstEnabledLanding();
      if (target) return withNoStore(req, NextResponse.redirect(new URL(target, req.url)));
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      return withNoStore(req, new NextResponse("Not Found", { status: 404 }));
    }
    return withNoStore(req, NextResponse.next());
  }

  if (pathname.startsWith("/dashboard")) {
<<<<<<< HEAD
    if (!isAllowed(pathname, flags)) {
=======
    if (!isAllowed(pathname)) {
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      return withNoStore(req, new NextResponse("Not Found", { status: 404 }));
    }
    return withNoStore(req, NextResponse.next());
  }

<<<<<<< HEAD
=======
  // /sign-in 直接 no-store 放行（减少陈旧 RSC）
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
  if (pathname === "/sign-in") {
    return withNoStore(req, NextResponse.next());
  }

  return NextResponse.next();
}
