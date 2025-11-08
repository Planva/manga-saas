"use client"

import { type ComponentType, useMemo } from "react"
import type { Route } from 'next'
import {
  Users,
  Shield,
  Settings2,
  BarChart3,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { usePathname } from "next/navigation"
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

const baseAdminNavItems: NavMainItem[] = [
  {
    title: "Users",
    url: "/admin",
    icon: Users,
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
  },
]

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
