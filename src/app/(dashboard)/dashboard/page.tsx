import { redirect } from "next/navigation";

import { getSessionFromCookie } from "@/utils/auth";
import { getSystemSettings } from "@/utils/system-settings";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardIndexPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/sign-in?next=/dashboard");

  const settings = await getSystemSettings();
  const dashboard = settings.dashboard;

  if (!dashboard.home) {
    redirect(dashboard.homeRoute || "/dashboard/billing");
  }

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
