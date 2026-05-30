"use client";

import { Moon } from "lucide-react";
import type { PresenceStatus } from "@/lib/use-presence";
import { cn } from "@/lib/utils";

/**
 * Discord-style presence dot. Designed to be overlaid on the
 * bottom-right of an avatar via absolute positioning - the dot has a
 * border that matches the surrounding background so it punches a
 * clean hole through the avatar circle.
 */

type Size = "xs" | "sm" | "md" | "lg";

interface StatusIndicatorProps {
  status: PresenceStatus;
  size?: Size;
  /** Tailwind class for the "punched-out" border color. */
  borderClass?: string;
  className?: string;
  /** Hide entirely (e.g. when presence isn't available yet). */
  hidden?: boolean;
}

const SIZE_MAP: Record<Size, string> = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
};

const ICON_SIZE_MAP: Record<Size, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

const BORDER_SIZE_MAP: Record<Size, string> = {
  xs: "border",
  sm: "border-2",
  md: "border-2",
  lg: "border-2",
};

const STATUS_LABEL: Record<PresenceStatus, string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};

export function StatusIndicator({
  status,
  size = "md",
  borderClass = "border-card",
  className,
  hidden,
}: StatusIndicatorProps) {
  if (hidden) return null;
  const sizeClass = SIZE_MAP[size];
  const borderWidth = BORDER_SIZE_MAP[size];
  const baseClass = cn(
    "rounded-full inline-flex items-center justify-center shrink-0",
    sizeClass,
    borderWidth,
    borderClass,
    className,
  );
  if (status === "online") {
    return (
      <span
        className={cn(baseClass, "bg-emerald-500")}
        role="status"
        aria-label={STATUS_LABEL.online}
        title={STATUS_LABEL.online}
      />
    );
  }
  if (status === "away") {
    return (
      <span
        className={cn(baseClass, "bg-amber-400 text-amber-900")}
        role="status"
        aria-label={STATUS_LABEL.away}
        title={STATUS_LABEL.away}
      >
        <Moon
          className={cn(ICON_SIZE_MAP[size], "fill-current")}
          strokeWidth={2.5}
        />
      </span>
    );
  }
  return (
    <span
      className={cn(baseClass, "bg-muted-foreground/60")}
      role="status"
      aria-label={STATUS_LABEL.offline}
      title={STATUS_LABEL.offline}
    />
  );
}

/**
 * Wrapper for an avatar that pins the status dot to the bottom-right.
 * `borderClass` controls the dot's "punch-through" color so it always
 * matches whatever surface the avatar sits on.
 */
export function AvatarStatusOverlay({
  status,
  size = "md",
  borderClass,
  hidden,
  className,
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 z-10 pointer-events-none",
        className,
      )}
    >
      <StatusIndicator
        status={status}
        size={size}
        borderClass={borderClass}
        hidden={hidden}
      />
    </span>
  );
}

export function statusLabel(status: PresenceStatus): string {
  return STATUS_LABEL[status];
}
