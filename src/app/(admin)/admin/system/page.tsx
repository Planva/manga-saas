import type { Metadata } from "next";

import { getAdminBannerSettings } from "@/utils/admin-banner-settings";
import { BannerSettingsForm } from "./_components/banner-settings-form";

export const metadata: Metadata = {
  title: "Announcement Banner",
  description: "Manage the global announcement banner that appears across the site.",
};

export default async function AnnouncementBannerPage() {
  const bannerSettings = await getAdminBannerSettings();

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Announcement Banner</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Craft scrolling announcements that appear on every public page. Customize the message list,
          rotation cadence, and banner height to match your brand.
        </p>
      </div>

      <BannerSettingsForm initialSettings={bannerSettings} />
    </div>
  );
}
