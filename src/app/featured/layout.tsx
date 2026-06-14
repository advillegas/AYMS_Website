import type { Metadata } from "next";
import { EventsJsonLd } from "@/components/seo/json-ld";
import { COMMUNITY_EVENTS } from "@/lib/events-data";
import { seoMetadata } from "@/lib/seo-config";

/**
 * Per-route metadata + structured data for /featured.
 *
 * The page itself is a Client Component (it hydrates CMS/builder state),
 * so metadata can't live there — App Router only reads metadata from
 * Server Components. A co-located server layout.tsx is the correct place.
 * The static OG image is inherited from the root layout's openGraph.images.
 */

const SITE_URL = "https://amigasymassocial.com";

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("featured", {
    title: "Featured Spotlight — This Month's Trip & Events",
    description:
      "See the featured Latina group trip everyone's talking about, plus upcoming " +
      "community events. Grab your spot and join the sisterhood with Amigas Y Más Social.",
    canonical: "/featured",
  });
}

export default function FeaturedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Surface upcoming community events as structured data so the spotlight
  // page is eligible for rich event results.
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
