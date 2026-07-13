"use client";

/**
 * Live-backend status chip for the community admin pages. The data hooks
 * behind those pages are dual-backend (Firebase now, Supabase behind
 * NEXT_PUBLIC_USE_SUPABASE), so the label names whichever backend is
 * actually active instead of hardcoding "Firebase".
 */

import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useSupabaseBackend } from "@/lib/supabase";

/** True when any live community backend is configured. */
export const BACKEND_LIVE = useSupabaseBackend || isFirebaseConfigured;

/** Display name of the active community-data backend. */
export const BACKEND_NAME = useSupabaseBackend ? "Supabase" : "Firebase";

export function BackendBadge({
  live = BACKEND_LIVE,
  className,
}: {
  /** Override when a page has its own liveness signal (e.g. members). */
  live?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
        live
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      {live ? (
        <>
          <Wifi className="h-3 w-3" /> {BACKEND_NAME} live
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" /> Local only
        </>
      )}
    </span>
  );
}
