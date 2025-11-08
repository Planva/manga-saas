import { getSessionFromCookie } from "@/utils/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSystemSettings } from "@/utils/system-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookie();
  if (!session) redirect("/sign-in");

  const settings = await getSystemSettings();

  return (
    <SidebarProvider>
      <AppSidebar featureFlags={settings.dashboard} />
      <SidebarInset className="w-full flex flex-col">{children}</SidebarInset>
    </SidebarProvider>
  );
}
