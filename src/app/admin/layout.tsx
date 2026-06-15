"use client";

import { useEffect } from "react";

/**
 * The admin dashboard is a dark UI, but shadcn/Base-UI dialogs render through a
 * portal on <body> — outside the dashboard's `dark` wrapper — so create/trip/
 * event modals were inheriting the site's light theme. Scoping `dark` onto
 * <body> while the admin is mounted makes those portaled dialogs (and their
 * tokens: bg-background, popover, inputs) resolve to the dark theme too. Removed
 * on unmount so the marketing site stays light.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("dark");
    return () => document.body.classList.remove("dark");
  }, []);
  return <>{children}</>;
}
