/**
 * Canonical community events.
 *
 * Lives in its own module (no zustand, no "use client") so server-side
 * route handlers (e.g. the /api/calendar/feed iCal route) can import
 * the same data the client store does without dragging in localStorage
 * or React.
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

export const COMMUNITY_EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    title: "Coffee and Cuties",
    description:
      "Monthly meetup for coffee and connection. Bring your little ones!",
    date: "2026-05-19",
    type: "social",
    location: "Local Café, LA",
    image: "/events/coffee.jpg",
  },
  {
    id: "e2",
    title: "AYMS Summer Camp 2026",
    description:
      "Our annual summer camp! Three days of fun, bonding, and empowerment.",
    date: "2026-07-15",
    endDate: "2026-07-18",
    type: "camp",
    location: "Camp Wilderness, CA",
    image: "/events/summer-camp.jpg",
  },
  {
    id: "e3",
    title: "Water Day",
    description: "Beat the heat with our summer water day celebration!",
    date: "2026-08-12",
    type: "social",
    location: "Riverside Park, LA",
  },
  {
    id: "e4",
    title: "Cancún Trip",
    description: "Group trip to Cancún! All-inclusive resort adventure.",
    date: "2026-08-20",
    endDate: "2026-08-25",
    type: "trip",
    location: "Cancún, Mexico",
    image: "/trips/cancun-aug-26.jpg",
  },
  {
    id: "e5",
    title: "Fall Kickoff Dinner",
    description: "Kick off the fall season with a community dinner.",
    date: "2026-09-12",
    type: "meetup",
    location: "Amiga's Kitchen, LA",
  },
  {
    id: "e6",
    title: "Dia de los Muertos Celebration",
    description: "Honor our loved ones with a beautiful celebration.",
    date: "2026-11-01",
    type: "social",
    location: "Community Center, LA",
  },
  {
    id: "e7",
    title: "Holiday Posada",
    description: "Annual holiday party with music, food, and gift exchange.",
    date: "2026-12-15",
    type: "social",
    location: "Maria's Home, LA",
  },
  {
    id: "e8",
    title: "Wine & Paint Night",
    description: "Unleash your inner artist! Supplies included.",
    date: "2026-05-05",
    type: "meetup",
    location: "Art Studio, Santa Monica",
  },
  {
    id: "e9",
    title: "Hiking Adventure",
    description:
      "Morning hike followed by brunch. All fitness levels welcome!",
    date: "2026-04-26",
    type: "meetup",
    location: "Griffith Observatory, LA",
    image: "/events/hiking.jpg",
  },
];
