"use client";

/**
 * Page-view beacon. Mounted once in the root layout; watches the App
 * Router pathname and records a `page_view` activity event on every
 * client-side route change (the first hit carries document.referrer,
 * subsequent ones the previous in-app path). Renders nothing.
 *
 * All writes are fire-and-forget (see src/lib/activity-tracker.ts) —
 * this can never block navigation or error the UI.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/activity-tracker";

export function ActivityTracker() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const referrer =
      prevPath.current ??
      (typeof document !== "undefined" ? document.referrer || null : null);
    if (prevPath.current !== pathname) {
      trackPageView(pathname, referrer);
      prevPath.current = pathname;
    }
  }, [pathname]);

  return null;
}
