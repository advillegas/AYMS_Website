/**
 * Per-user "how do other people see my name" preference.
 *
 *  - "full"    -> "Sofia Rodriguez"  (default, what the rest of the app
 *                  used to do unconditionally)
 *  - "initial" -> "Sofia R."         (privacy-friendly middle ground)
 *  - "first"   -> "Sofia"            (first name only - hides last name)
 *
 * The setting belongs to the *displayed* user. So if Sofia picks
 * "first", every other amiga sees "Sofia" wherever her name renders -
 * chat author, member list, profile sidecar, member detail card,
 * mention chips, etc. Sofia herself still sees her real full name in
 * her own profile and the top-nav avatar so it doesn't feel like the
 * site forgot who she is.
 *
 * Admin / moderation views intentionally bypass the formatter and
 * show the real full name so admins can identify members reliably.
 */

export type NameDisplay = "full" | "initial" | "first";

/** Trim, normalise multiple spaces, return non-empty parts. */
function nameParts(fullName: string): string[] {
  return fullName.trim().split(/\s+/).filter(Boolean);
}

/**
 * Apply a name-display preference to a full name. Single-word names
 * (or empty input) always render as the original input regardless of
 * preference - there's no last name to hide.
 */
export function formatDisplayName(
  fullName: string,
  mode?: NameDisplay | null,
): string {
  const safeMode = mode ?? "full";
  if (!fullName) return fullName;
  if (safeMode === "full") return fullName;
  const parts = nameParts(fullName);
  if (parts.length <= 1) return fullName;
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (safeMode === "first") return first;
  if (safeMode === "initial") {
    const initial = last.charAt(0).toUpperCase();
    return `${first} ${initial}.`;
  }
  return fullName;
}

interface NameDisplayOption {
  value: NameDisplay;
  label: string;
  /** Live example using the user's own full name. */
  preview: (fullName: string) => string;
  description: string;
}

export const NAME_DISPLAY_OPTIONS: NameDisplayOption[] = [
  {
    value: "full",
    label: "Full name",
    preview: (n) => n,
    description: "Other amigas see your full first and last name.",
  },
  {
    value: "initial",
    label: "Last initial",
    preview: (n) => formatDisplayName(n, "initial"),
    description: "Show your first name plus the first letter of your last name.",
  },
  {
    value: "first",
    label: "First name only",
    preview: (n) => formatDisplayName(n, "first"),
    description: "Hide your last name from other members entirely.",
  },
];
