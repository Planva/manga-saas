import type { Metadata } from "next";

import { getSystemSettings } from "@/utils/system-settings";
import { DashboardFlagsForm } from "./_components/dashboard-flags-form";

export const metadata: Metadata = {
  title: "Dashboard Navigation",
  description: "配置仪表盘侧边栏显示的菜单。",
};

export default async function DashboardNavigationPage() {
  const settings = await getSystemSettings();

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">仪表盘菜单设置</h1>
        <p className="text-sm text-muted-foreground">
          选择仪表盘左侧栏需要显示的模块，并指定当首页关闭时的默认跳转路径。
        </p>
      </div>

      <DashboardFlagsForm initialFlags={settings.dashboard} />
    </div>
  );
}
