import { getSessionFromCookie } from "@/utils/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
<<<<<<< HEAD
import { getSystemSettings } from "@/utils/system-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

=======
import { FEATURES } from "@/config/features"; // ← 仍然在服务端读取
export const dynamic = "force-dynamic";
export const revalidate = 0;
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookie();
  if (!session) redirect("/sign-in");

<<<<<<< HEAD
  const settings = await getSystemSettings();

  return (
    <SidebarProvider>
      <AppSidebar featureFlags={settings.dashboard} />
=======
  return (
    <SidebarProvider>
      <AppSidebar featureFlags={FEATURES} /> {/* ← 传入服务端读取的 flags */}
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      <SidebarInset className="w-full flex flex-col">{children}</SidebarInset>
    </SidebarProvider>
  );
}
