"use client";

import { useEffect } from "react";
import { useSiteSettings } from "@/lib/use-site-content";

/**
 * Applies the owner's brand colors to the global CSS variables at runtime.
 * The marketing components reference these vars (var(--magenta) etc.) instead
 * of hardcoded hex, so changing them in Admin → Settings recolors the site
 * live. Defaults live in globals.css, so SSR renders the brand colors
 * correctly before this hydrates.
 */
export function SiteThemeVars() {
  const { brandPrimary, brandDeep, brandCoral } = useSiteSettings();

  useEffect(() => {
    const root = document.documentElement.style;
    if (brandPrimary) {
      root.setProperty("--primary", brandPrimary);
      root.setProperty("--magenta", brandPrimary);
    }
    if (brandDeep) root.setProperty("--brand-pink", brandDeep);
    if (brandCoral) root.setProperty("--coral", brandCoral);
  }, [brandPrimary, brandDeep, brandCoral]);

  return null;
}
