"use client"

import { useEffect } from "react"

export function NavigationActiveMarker() {
  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>("[data-active]");
    const current = window.location.pathname;

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      const isHome = href === "/";
      const active = isHome ? current === "/" : current === href || current.startsWith(`${href}/`);
      if (active) {
        link.setAttribute("data-active", "true");
      } else {
        link.setAttribute("data-active", "false");
      }
    });
  }, []);

  return null;
}
