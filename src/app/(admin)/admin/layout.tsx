import { AdminSidebar } from "./_components/admin-sidebar"
import { requireAdmin } from "@/utils/auth"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { redirect } from "next/navigation"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin({ doNotThrowError: true })

  if (!session) {
    return redirect('/')
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
<<<<<<< HEAD
      <SidebarInset className="flex w-full flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
=======
      <SidebarInset className="w-full flex flex-col">
        {children}
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      </SidebarInset>
    </SidebarProvider>
  )
}
