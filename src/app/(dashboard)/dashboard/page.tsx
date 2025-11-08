<<<<<<< HEAD
import { redirect } from "next/navigation";

import { getSessionFromCookie } from "@/utils/auth";
import { getSystemSettings } from "@/utils/system-settings";
=======
// src/app/(dashboard)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getDashboardHomeConfig } from "@/config/dashboard-home";
import { getSessionFromCookie } from "@/utils/auth";
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardIndexPage() {
<<<<<<< HEAD
  const session = await getSessionFromCookie();
  if (!session) redirect("/sign-in?next=/dashboard");

  const settings = await getSystemSettings();
  const dashboard = settings.dashboard;

  if (!dashboard.home) {
    redirect(dashboard.homeRoute || "/dashboard/billing");
  }

=======
  // （可选）登录保护；如果你的 middleware 已经做了，可以保留也可去掉
  const session = await getSessionFromCookie();
  if (!session) redirect("/sign-in?next=/dashboard");

  const { useBuiltInHome, landing } = getDashboardHomeConfig();

  // 关闭内置首页 → 直接 302 到你指定的板块（如 /dashboard/billing）
  if (!useBuiltInHome) {
    redirect(landing);
  }

  // ↓↓↓ 内置首页（开关为 true 才会渲染），你可以保留之前的占位内容或自定义
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
  return (
    <>
      <PageHeader items={[{ href: "/dashboard", label: "Dashboard" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
            Example
          </div>
          <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
            Example
          </div>
          <div className="aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
            Example
          </div>
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min flex items-center justify-center">
          Example
        </div>
      </div>
    </>
  );
}
