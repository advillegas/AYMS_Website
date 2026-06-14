import type { Metadata } from "next";
import { EventsJsonLd } from "@/components/seo/json-ld";
import { COMMUNITY_EVENTS } from "@/lib/events-data";
import { seoMetadata } from "@/lib/seo-config";

/**
 * Per-route metadata + structured data for /events.
 *
 * The events page is a Client Component, so metadata + JSON-LD live in this
 * co-located Server layout (App Router only reads metadata and renders
 * server-only structured data from Server Components). /events is the
 * canonical events surface, so the ItemList of upcoming events belongs here.
 */

const SITE_URL = "https://amigasymassocial.com";

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("events", {
    title: "Events & Meetups for Latinas",
    description:
      "Coffee meetups, camp weekends, city adventures, and more. " +
      "Find upcoming Latina community events near you and RSVP to connect with your new amigas.",
    canonical: "/events",
  });
}

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Emit upcoming events as structured data so /events is eligible for rich
  // event results (mirrors the /featured spotlight's ItemList of events).
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = COMMUNITY_EVENTS.filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  return (
    <>
      <EventsJsonLd
        events={upcoming.map((e) => ({
          name: e.title,
          description: e.description,
          startDate: e.date,
          ...(e.endDate ? { endDate: e.endDate } : {}),
          location: e.location,
          url: `${SITE_URL}/events`,
        }))}
      />
      {children}
    </>
  );
}
