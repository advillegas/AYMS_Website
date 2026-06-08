import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Derive up-to-two-letter initials from a display name.
 * "Maria Garcia" -> "MG", "Maria" -> "M", empty -> "?".
 * Robust against extra whitespace and undefined input so avatar
 * fallbacks never render "undefined".
 */
export function initials(name?: string | null): string {
  if (!name) return "?"
  const result = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2)
  return result || "?"
}
