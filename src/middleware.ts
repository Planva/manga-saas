// src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { FEATURES } from "@/config/features";

// 同时匹配根 /dashboard 和其子路径
export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };

// 规范化落地路由（允许写成 'dashboard/billing' 或 '/dashboard/billing'）
function normalizeLanding(raw?: string) {
  const v = (raw ?? "/dashboard/billing").trim();
  return v.startsWith("/") ? v : `/${v.replace(/^\/+/, "")}`;
}

// 当前路径是否被开关允许
function isAllowed(pathname: string) {
  if (pathname === "/dashboard") return FEATURES.HOME;
  if (pathname.startsWith("/dashboard/teams")) return FEATURES.TEAMS;
  if (pathname.startsWith("/dashboard/marketplace")) return FEATURES.MARKETPLACE;
  if (pathname.startsWith("/dashboard/billing")) return FEATURES.BILLING;
  if (pathname.startsWith("/dashboard/settings")) return FEATURES.SETTINGS;
  return true;
}

// 当指定的落地页不可用时，挑一个可用的兜底
function firstEnabledLanding(): string | null {
  if (FEATURES.BILLING) return "/dashboard/billing";
  if (FEATURES.SETTINGS) return "/dashboard/settings";
  if (FEATURES.TEAMS) return "/dashboard/teams";
  if (FEATURES.MARKETPLACE) return "/dashboard/marketplace";
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 处理 /dashboard 根路由：当关闭内置首页时，按配置重定向到指定板块
  if (pathname === "/dashboard") {
    if (FEATURES.HOME === false) {
      const envLanding = normalizeLanding(process.env.DASHBOARD_HOME_ROUTE);
      const target = isAllowed(envLanding) ? envLanding : firstEnabledLanding();

      if (target) {
        return NextResponse.redirect(new URL(target, req.url));
      }
      // 没有任何板块开启
      return new NextResponse("Not Found", { status: 404 });
    }
    // 开启内置首页则放行
    return NextResponse.next();
  }

  // 其他 /dashboard/* 子路由按开关拦截
  if (!isAllowed(pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}
