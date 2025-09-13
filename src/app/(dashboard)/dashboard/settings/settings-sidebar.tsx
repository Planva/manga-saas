// src/app/(dashboard)/dashboard/settings/settings-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils"; // 你项目里合适的 cn 工具
import {
  User,
  Shield,
  MonitorSmartphone,
  KeyRound,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "./settings.actions"; // 你原本的登出 action（若无，就去掉按钮或改为现有登出逻辑）

const NAV = [
  { href: "/dashboard/settings", icon: User, label: "Profile" },
  { href: "/dashboard/settings/security", icon: Shield, label: "Security" },
  { href: "/dashboard/settings/sessions", icon: MonitorSmartphone, label: "Sessions" },
  { href: "/dashboard/settings/change-password", icon: KeyRound, label: "Change Password" },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}

      {/* 登出（可选） */}
      <form action={signOutAction} className="pt-2">
        <Button variant="destructive" className="w-full" type="submit">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
