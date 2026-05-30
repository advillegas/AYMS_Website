import type { Metadata } from "next";
import { TripsJsonLd } from "@/components/seo/json-ld";
import { TRIPS_DATA } from "@/lib/trips-data";

export const metadata: Metadata = {
  title: "Latina Group Trips — Book Your Next Adventure",
  description:
    "Browse curated group trips for Latinas to Cancún, Colombia, Bali, Japan, Kenya, Morocco & more. " +
    "Small groups, all-inclusive vibes, and a built-in sisterhood. Book your spot today.",
  openGraph: {
    title: "Latina Group Trips — Book Your Next Adventure | Amigas Y Más Social",
    description:
      "Curated group travel for Latinas. Small groups, bucket-list destinations, lifelong friendships.",
  },
  alternates: {
    canonical: "/trips",
  },
};

const STATUS_TO_AVAILABILITY = {
  available: "InStock" as const,
  "sold-out": "SoldOut" as const,
  waitlist: "PreOrder" as const,
  "coming-soon": "PreOrder" as const,
};

export default function TripsLayout({
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
          url: `https://amigasymassocial.com/trips#${t.id}`,
          price: t.price,
          availability: STATUS_TO_AVAILABILITY[t.status],
          location: `${t.destination}, ${t.country}`,
        }))}
      />
      {children}
    </>
  );
}
