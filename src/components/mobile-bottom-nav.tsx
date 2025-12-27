"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Route } from "next";
import { Home, CreditCard, BookOpen, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
    isEnabled: boolean;
}

export function MobileBottomNav({ isEnabled }: MobileBottomNavProps) {
    const pathname = usePathname();

    if (!isEnabled) return null;

    const navItems = [
        {
            name: "Home",
            href: "/",
            icon: Home,
        },
        {
            name: "Price",
            href: "/price",
            icon: CreditCard,
        },
        {
            name: "Blog",
            href: "/blog",
            icon: BookOpen,
        },
        {
            name: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-safe md:hidden">
            <nav className="flex h-16 items-center justify-around">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        item.href === "/"
                            ? pathname === "/"
                            : pathname?.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href as Route}
                            className={cn(
                                "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-xs font-medium transition-colors hover:bg-muted active:bg-muted/70 touch-manipulation min-h-[64px]",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-6 w-6" />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
