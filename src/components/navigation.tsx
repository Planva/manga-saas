import Link from "next/link"
import type { Route } from "next"
import { ComponentIcon } from "lucide-react"
import { MobileMenu } from "./mobile-menu.client";
import { SITE_NAME } from "@/constants"
import { Button } from "@/components/ui/button"
import { getSessionFromCookie } from "@/utils/auth"
import { cn } from "@/lib/utils"
import { getSystemSettings } from "@/utils/system-settings"
import { NavigationActiveMarker } from "./navigation-active"

type NavItem = {
  name: string
  zh: string
  href: Route
}

function NavLinks({ navItems }: { navItems: NavItem[] }) {
  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
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

// Revert type to remove 'zh' if desired, or just ignore it.
// User requested English labels for bottom nav, but Chinese labels here were for Top Menu?
// User said: 2、底部导航栏要点击文字或图标都可以进入页面，而不是点击文字才能进入。底部导航栏使用英文
// "Bottom nav use English". Top menu "Hamburger menu no response".
// I will fix Hamburger menu. And I will revert Bottom Nav to English in the NEXT step (mobile-bottom-nav.tsx).
// Here I should probably keep Chinese for Top Menu if user didn't explicitly say "Top menu use English".
// User only said "Bottom nav use English".
// But "Hamburger menu no response".
// So I fix Hamburger menu structure first.



export async function Navigation() {
  const session = await getSessionFromCookie()
  const settings = await getSystemSettings()

  const navItems: NavItem[] = [
    { name: "Home", zh: "首页", href: "/" },
    { name: "Pricing", zh: "价格", href: "/price" },
    ...(settings.blogEnabled ? [{ name: "Blog", zh: "博客", href: "/blog" } as NavItem] : []),
    ...(session ? [{ name: "Dashboard", zh: "控制台", href: "/dashboard" } as NavItem] : []),
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
                <Link href="/sign-in">登录</Link>
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
