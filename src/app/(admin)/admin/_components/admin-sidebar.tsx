"use client"

<<<<<<< HEAD
import { type ComponentType, useMemo } from "react"
=======
import { type ComponentType } from "react"
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
import type { Route } from 'next'
import {
  Users,
  Shield,
<<<<<<< HEAD
  Settings2,
  BarChart3,
=======
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
<<<<<<< HEAD
import { usePathname } from "next/navigation"
=======
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
} from "@/components/ui/sidebar"

export type NavItem = {
  title: string
  url: Route
  icon?: ComponentType
}

export type NavMainItem = NavItem & {
  isActive?: boolean
  items?: NavItem[]
}

<<<<<<< HEAD
const baseAdminNavItems: NavMainItem[] = [
=======
const adminNavItems: NavMainItem[] = [
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
  {
    title: "Users",
    url: "/admin",
    icon: Users,
<<<<<<< HEAD
  },
  {
    title: "System Settings",
    url: "/admin/system",
    icon: Settings2,
    items: [
      {
        title: "Announcement Banner",
        url: "/admin/system",
      },
      {
        title: "Credit Settings",
        url: "/admin/system/credits",
      },
      {
        title: "Dashboard Navigation",
        url: "/admin/system/navigation",
      },
    ],
  },
  {
    title: "User Analytics",
    url: "/admin/system/analytics",
    icon: BarChart3,
=======
    isActive: true,
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
  },
]

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
<<<<<<< HEAD
  const pathname = usePathname() ?? "/admin"
  const navItems = useMemo(
    () =>
      baseAdminNavItems.map((item) => {
        const childActive = item.items?.some((subItem) => pathname.startsWith(subItem.url));
        const isActive = pathname.startsWith(item.url) || Boolean(childActive);
        return {
          ...item,
          isActive,
        };
      }),
    [pathname],
  );

=======
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="pointer-events-none"
                tooltip="Admin Panel"
              >
                <Shield size={24} />
                <span className="text-lg font-bold">Admin Panel</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
<<<<<<< HEAD
        <NavMain items={navItems} />
=======
        <NavMain items={adminNavItems} />
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
