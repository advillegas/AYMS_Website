/**
 * Shared CalendarEvent shape for the community events feed.
 *
 * Lives in its own module (no zustand, no "use client") so server-side
 * route handlers can import it without dragging in localStorage or React.
 *
 * NOTE: this file used to export a hardcoded COMMUNITY_EVENTS seed array
 * that auto-seeded the database and rendered as a fallback. That was
 * removed on purpose — the database is now the ONLY source of events, so
 * events the admin deletes stay deleted and an empty calendar renders an
 * empty page. Do not add static event data back here.
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  /** Start time in HH:mm (24h). Omit for all-day events. */
  startTime?: string;
  /** End time in HH:mm (24h). Omit for all-day events. */
  endTime?: string;
  type: "trip" | "meetup" | "camp" | "social" | "synced";
  location: string;
  /** Map coordinates for the location pin (set by geocoding the address). */
  lat?: number;
  lng?: number;
  /** Optional external link (e.g. a payment / registration / details page). */
  link?: string;
  /** Custom label for the link button (defaults to "Open link"). */
  linkLabel?: string;
  /**
   * Optional attendance cap. When set, the RSVP affordance shows
   * "X going · N spots left" and disables "Going" once full.
   * Omit (or 0) for unlimited.
   */
  capacity?: number;
  /**
   * For member-hosted entries (meetups) merged into this shape: the host's
   * user id, so the unified calendar can let a host manage their own item.
   */
  hostId?: string;
  /**
   * Optional representative photo (self-hosted under /public). When set, the
   * events list renders it behind the date stamp; otherwise the brand gradient
   * shows. Lets us add imagery where an event maps to a real place/activity.
   */
  image?: string;
  /**
   * Admin publish gate. Only published events render on the public marketing
   * site; drafts are visible to admins in the CRM only. `undefined` counts as
   * published so the legacy static seeds (and any event created before this
   * field existed) keep showing.
   */
  published?: boolean;
}

