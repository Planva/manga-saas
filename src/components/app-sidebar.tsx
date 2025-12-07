"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Route } from "next";
import {
  Building2,
  SquareTerminal,
  Users,
  ShoppingCart,
  CreditCard,
  Settings2,
  Home,
} from "lucide-react";
import Link from "next/link";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useSessionStore } from "@/state/session";

type DashboardFeatureFlags = {
  home: boolean;
  teams: boolean;
  marketplace: boolean;
  billing: boolean;
  settings: boolean;
};

export type NavItem = {
  title: string;
  url: Route;
  icon?: ComponentType<unknown>;
};

export type NavMainItem = NavItem & {
  isActive?: boolean;
  items?: NavItem[];
};

type Props = React.ComponentProps<typeof Sidebar> & {
  featureFlags: DashboardFeatureFlags;
};

type TeamOption = {
  name: string;
  logo: ComponentType<unknown>;
  plan: string;
};

export function AppSidebar({ featureFlags, ...sidebarProps }: Props) {
  const { session } = useSessionStore();
  const [teams, setTeams] = useState<TeamOption[]>([]);

  useEffect(() => {
    if (session?.teams?.length) {
      setTeams(
        session.teams.map((team) => ({
          name: team.name,
          logo: Building2,
          plan: team.role.name || "Member",
        })),
      );
    }
  }, [session]);

  const navMain: NavMainItem[] = [
    ...(featureFlags.home
      ? [{ title: "Dashboard", url: "/dashboard" as Route, icon: SquareTerminal }]
      : []),
    ...(featureFlags.teams
      ? [{ title: "Teams", url: "/dashboard/teams" as Route, icon: Users }]
      : []),
    ...(featureFlags.marketplace
      ? [{ title: "Marketplace", url: "/dashboard/marketplace" as Route, icon: ShoppingCart }]
      : []),
    ...(featureFlags.billing
      ? [{ title: "Billing", url: "/dashboard/billing" as Route, icon: CreditCard }]
      : []),
    ...(featureFlags.settings
      ? [{ title: "Settings", url: "/dashboard/settings" as Route, icon: Settings2 }]
      : []),
  ];

  return (
    <Sidebar collapsible="icon" {...sidebarProps}>
      <SidebarHeader>
        <div className="px-2 pt-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Home className="h-4 w-4" />
            <span className="truncate">Back to site</span>
          </Link>
        </div>

        {teams.length > 0 && (
          <div className="px-2 pb-2">
            <TeamSwitcher teams={teams} />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
