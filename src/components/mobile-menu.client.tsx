"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import type { Route } from "next";

type NavItem = {
    name: string;
    zh?: string;
    href: Route;
};

export function MobileMenu({
    navItems,
    hasSession,
}: {
    navItems: NavItem[];
    hasSession: boolean;
}) {
    const detailsRef = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
                detailsRef.current.open = false;
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <details ref={detailsRef} className="md:hidden group relative">
            <summary className="list-none cursor-pointer p-4 -m-4">
                <Menu className="w-9 h-9" />
                <span className="sr-only">Open menu</span>
            </summary>
            <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-popover p-2 shadow-md outline-none animate-in fade-in-0 zoom-in-95 z-50">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-sm px-3 py-2 text-sm font-medium hover:bg-muted"
                        onClick={() => {
                            if (detailsRef.current) detailsRef.current.open = false;
                        }}
                    >
                        {item.name}
                    </Link>
                ))}
                {!hasSession && (
                    <div className="border-t mt-2 pt-2">
                        <Button asChild className="w-full justify-start h-auto py-2 px-3" variant="ghost">
                            <Link href="/sign-in">Sign In / Sign Up</Link>
                        </Button>
                    </div>
                )}
            </div>
        </details>
    );
}
