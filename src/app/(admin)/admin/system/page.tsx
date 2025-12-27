import type { Metadata } from "next";

import { getAdminBannerSettings } from "@/utils/admin-banner-settings";
import { getSystemSettings } from "@/utils/system-settings";
import { BannerSettingsForm } from "./_components/banner-settings-form";
import { BlogToggleForm } from "./_components/blog-toggle-form";
import { AgenticBannerToggleForm } from "./_components/agentic-banner-toggle-form";
import { MobileNavToggleForm } from "./_components/mobile-nav-toggle-form";

export const metadata: Metadata = {
  title: "系统设置",
  description: "管理公告横幅、内容开关等站点级别设置。",
};

export default async function SystemSettingsPage() {
  const [bannerSettings, systemSettings] = await Promise.all([
    getAdminBannerSettings(),
    getSystemSettings(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          管理公告横幅、博客开关、弹窗显示等全局配置。
        </p>
      </div>

      <BannerSettingsForm initialSettings={bannerSettings} />
      <BlogToggleForm initialEnabled={systemSettings.blogEnabled} />
      <AgenticBannerToggleForm initialEnabled={systemSettings.agenticBannerEnabled} />
      <MobileNavToggleForm initialEnabled={systemSettings.mobileBottomNavEnabled} />
    </div>
  );
}
