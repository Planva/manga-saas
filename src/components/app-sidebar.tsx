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
<<<<<<< HEAD
  Home,
} from "lucide-react";
import Link from "next/link";
=======
} from "lucide-react";
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2

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
<<<<<<< HEAD

type DashboardFeatureFlags = {
  home: boolean;
  teams: boolean;
  marketplace: boolean;
  billing: boolean;
  settings: boolean;
=======
import Link from "next/link";
import { Home /* 或 Globe, ArrowLeft */ } from "lucide-react";
type FeatureFlags = {
  HOME: boolean;
  TEAMS: boolean;
  MARKETPLACE: boolean;
  BILLING: boolean;
  SETTINGS: boolean;
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
};

export type NavItem = {
  title: string;
  url: Route;
  icon?: ComponentType<any>;
};
<<<<<<< HEAD

export type NavMainItem = NavItem & {
  isActive?: boolean;
  items?: NavItem[];
};

type Props = React.ComponentProps<typeof Sidebar> & {
  featureFlags: DashboardFeatureFlags;
};

type TeamOption = {
  name: string;
  logo: ComponentType<any>;
  plan: string;
=======
export type NavMainItem = NavItem & { isActive?: boolean; items?: NavItem[] };

type Data = {
  teams: { name: string; logo: ComponentType<any>; plan: string }[];
};

type Props = React.ComponentProps<typeof Sidebar> & {
  featureFlags: FeatureFlags; // ← 新增
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
};

export function AppSidebar({ featureFlags, ...sidebarProps }: Props) {
  const { session } = useSessionStore();
<<<<<<< HEAD
  const [teams, setTeams] = useState<TeamOption[]>([]);

  useEffect(() => {
    if (session?.teams?.length) {
      setTeams(
        session.teams.map((team) => ({
          name: team.name,
          logo: Building2,
          plan: team.role.name || "Member",
        })),
=======
  const [formattedTeams, setFormattedTeams] = useState<Data["teams"]>([]);

  useEffect(() => {
    if (session?.teams?.length) {
      setFormattedTeams(
        session.teams.map((t) => ({
          name: t.name,
          logo: Building2,
          plan: t.role.name || "Member",
        }))
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      );
    }
  }, [session]);

  const navMain: NavMainItem[] = [
<<<<<<< HEAD
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
=======
    ...(featureFlags.HOME
      ? [{ title: "Dashboard", url: "/dashboard" as Route, icon: SquareTerminal }]
      : []),
    ...(featureFlags.TEAMS
      ? [{ title: "Teams", url: "/dashboard/teams" as Route, icon: Users }]
      : []),
    ...(featureFlags.MARKETPLACE
      ? [{ title: "Marketplace", url: "/dashboard/marketplace" as Route, icon: ShoppingCart }]
      : []),
    ...(featureFlags.BILLING
      ? [{ title: "Billing", url: "/dashboard/billing" as Route, icon: CreditCard }]
      : []),
    ...(featureFlags.SETTINGS
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      ? [{ title: "Settings", url: "/dashboard/settings" as Route, icon: Settings2 }]
      : []),
  ];

  return (
    <Sidebar collapsible="icon" {...sidebarProps}>
<<<<<<< HEAD
=======
      {/* ① 总是渲染 Header；把“返回主页”放在最上方 */}
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
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

<<<<<<< HEAD
        {teams.length > 0 && (
          <div className="px-2 pb-2">
            <TeamSwitcher teams={teams} />
=======
        {/* ② 保留原来的 TeamSwitcher（有团队时显示） */}
        {formattedTeams.length > 0 && (
          <div className="px-2 pb-2">
            <TeamSwitcher teams={formattedTeams} />
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
<<<<<<< HEAD

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

=======
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
      <SidebarRail />
    </Sidebar>
  );
}
