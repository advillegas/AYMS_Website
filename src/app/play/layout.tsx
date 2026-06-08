import type { Metadata } from "next";
import { TripsJsonLd } from "@/components/seo/json-ld";
import { TRIPS_DATA } from "@/lib/trips-data";

/**
 * Per-route metadata + structured data for /play.
 *
 * The /play page is an interactive Client Component (quiz, map, story
 * game), so metadata can't be exported from it — App Router resolves
 * `metadata` only from Server Components (per node_modules/next/dist/docs).
 * This co-located server layout supplies it and passes children through.
 *
 * The quiz matches players to a destination, so TripsJsonLd is the
 * relevant structured data. The OG image inherits from the root layout
 * (/og-default.png).
 */

const SITE_URL = "https://amigasymassocial.com";

const STATUS_TO_AVAILABILITY = {
  available: "InStock" as const,
  "sold-out": "SoldOut" as const,
  waitlist: "PreOrder" as const,
  "coming-soon": "PreOrder" as const,
};

export const metadata: Metadata = {
  title: "Find Your Destination — Latina Travel Quiz & Game",
  description:
    "Play the AYMS travel quiz to discover your perfect group-trip destination, " +
    "explore the map, and live the story. A fun way to find your next adventure with your amigas.",
  openGraph: {
    title: "Find Your Destination — Travel Quiz | Amigas Y Más Social",
    description:
      "Take the quiz, explore the map, and discover your perfect Latina group-trip destination.",
    url: `${SITE_URL}/play`,
  },
  alternates: {
    canonical: "/play",
  },
};

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TripsJsonLd
        trips={TRIPS_DATA.map((t) => ({
          name: t.title,
          description: t.description,
          url: `${SITE_URL}/trips#${t.id}`,
          price: t.price,
          availability: STATUS_TO_AVAILABILITY[t.status],
          location: `${t.destination}, ${t.country}`,
        }))}
      />
      {children}
    </>
  );
}
