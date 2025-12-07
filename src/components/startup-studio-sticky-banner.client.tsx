"use client";

import { useEffect } from "react";

interface Props {
  storageKey: string;
}

export function AgenticDevStudioStickyBannerClient({ storageKey }: Props) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-agenticdev-sticky]");
    if (!root) return;

    const collapseBtn = root.querySelector<HTMLElement>("[data-collapse-btn]");
    const expandBtn = root.querySelector<HTMLElement>("[data-expand-btn]");

    const setCollapsed = (value: boolean) => {
      root.setAttribute("data-collapsed", value ? "true" : "false");
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // ignore storage issues
      }
    };

    const readInitial = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : false;
      } catch {
        return false;
      }
    };

    if (readInitial()) {
      setCollapsed(true);
    }

    const handleCollapse = (event: Event) => {
      event.preventDefault();
      setCollapsed(true);
    };

    const handleExpand = (event: Event) => {
      event.preventDefault();
      setCollapsed(false);
    };

    collapseBtn?.addEventListener("click", handleCollapse);
    expandBtn?.addEventListener("click", handleExpand);

    root.setAttribute("data-ready", "true");

    return () => {
      collapseBtn?.removeEventListener("click", handleCollapse);
      expandBtn?.removeEventListener("click", handleExpand);
    };
  }, [storageKey]);

  return null;
}
