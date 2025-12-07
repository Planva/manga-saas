import Link from "next/link"
import type { Route } from "next"
import { ComponentIcon, Menu } from "lucide-react"
import { SITE_NAME } from "@/constants"
import { Button } from "@/components/ui/button"
import { getSessionFromCookie } from "@/utils/auth"
import { cn } from "@/lib/utils"
import { getSystemSettings } from "@/utils/system-settings"
import { NavigationActiveMarker } from "./navigation-active"

type NavItem = {
  name: string
  href: Route
}

function NavLinks({ navItems }: { navItems: NavItem[] }) {
  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className="text-muted-foreground hover:text-foreground no-underline px-3 h-16 flex items-center text-sm font-medium transition-colors relative data-[active=true]:text-foreground data-[active=true]:after:absolute data-[active=true]:after:left-0 data-[active=true]:after:bottom-0 data-[active=true]:after:h-0.5 data-[active=true]:after:w-full data-[active=true]:after:bg-foreground"
          data-active="false"
        >
          {item.name}
        </Link>
      ))}
    </>
  )
}

function MobileMenu({ navItems, hasSession }: { navItems: NavItem[]; hasSession: boolean }) {
  return (
    <details className="md:hidden">
      <summary className="list-none">
        <Button variant="ghost" size="icon" className="p-6" aria-label="Open menu">
          <Menu className="w-9 h-9" />
          <span className="sr-only">Open menu</span>
        </Button>
      </summary>
      <div className="mt-3 pb-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 no-underline transition-colors relative data-[active=true]:text-foreground"
            data-active="false"
          >
            {item.name}
          </Link>
        ))}
        {!hasSession && (
          <div className="px-3 pt-4">
            <Button asChild className="w-full">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        )}
      </div>
    </details>
  )
}

export async function Navigation() {
  const session = await getSessionFromCookie()
  const settings = await getSystemSettings()

  const navItems: NavItem[] = [
    { name: "Home", href: "/" },
    { name: "Pricing", href: "/price" },
    ...(settings.blogEnabled ? [{ name: "Blog", href: "/blog" } as NavItem] : []),
    ...(session ? [{ name: "Dashboard", href: "/dashboard" } as NavItem] : []),
  ]

  return (
    <nav className="dark:bg-muted/30 bg-muted/60 shadow dark:shadow-xl z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className={cn(
                "text-xl md:text-2xl font-bold text-primary flex items-center gap-2 md:gap-3",
                "no-underline"
              )}
            >
              <ComponentIcon className="w-6 h-6 md:w-7 md:h-7" />
              {SITE_NAME}
            </Link>
          </div>
          <div className="hidden md:flex md:items-center md:space-x-6">
            <div className="flex items-baseline space-x-4">
              <NavLinks navItems={navItems} />
            </div>
            {!session && (
              <Button asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
            )}
          </div>
          <MobileMenu navItems={navItems} hasSession={Boolean(session)} />
        </div>
      </div>
      <NavigationActiveMarker />
    </nav>
  )
}

