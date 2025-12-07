"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function NavigationActiveMarker() {
  const pathname = usePathname()

  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>("[data-active]")
    const current = pathname || window.location.pathname

    links.forEach((link) => {
      const href = link.getAttribute("href")
      if (!href) return
      const isHome = href === "/"
      const active = isHome ? current === "/" : current === href || current.startsWith(`${href}/`)
      link.setAttribute("data-active", active ? "true" : "false")
    })
  }, [pathname])

  return null
}
