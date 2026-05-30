/**
 * Structured data components (JSON-LD) for SEO.
 *
 * Each function returns a <script type="application/ld+json"> element
 * that can be dropped into any server or client component. Google
 * uses these to surface rich snippets (FAQ accordions, event cards,
 * trip carousels, organization knowledge-panel, etc.).
 */

const SITE_URL = "https://amigasymassocial.com";
const SITE_NAME = "Amigas Y Más Social";
const LOGO_URL = `${SITE_URL}/ayms-logo.svg`;

interface JsonLdProps {
  data: Record<string, unknown>;
}

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: LOGO_URL,
        description:
          "The Latina travel community where you find your new amigas. " +
          "Group trips, events, and sisterhood for Latinas everywhere.",
        sameAs: [
          "https://www.instagram.com/amigasymassocial",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          email: "hello@amigasymassocial.com",
          contactType: "customer service",
        },
      }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description:
          "Latina travel community offering curated group trips, " +
          "community events, and a sisterhood for Latinas worldwide.",
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          logo: {
            "@type": "ImageObject",
            url: LOGO_URL,
          },
        },
      }}
    />
  );
}

interface FaqItem {
  q: string;
  a: string;
}

export function FAQPageJsonLd({ items }: { items: FaqItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      }}
    />
  );
}

interface TripItem {
  name: string;
  description: string;
  url: string;
  price: number;
  currency?: string;
  availability: "InStock" | "SoldOut" | "PreOrder";
  startDate?: string;
  endDate?: string;
  location?: string;
  image?: string;
}

export function TripsJsonLd({ trips }: { trips: TripItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Latina Group Trips",
        description:
          "Curated group travel experiences for Latinas — book your next adventure.",
        itemListElement: trips.map((trip, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "TouristTrip",
            name: trip.name,
            description: trip.description,
            url: trip.url,
            touristType: "Latina travelers",
            offers: {
              "@type": "Offer",
              price: trip.price,
              priceCurrency: trip.currency ?? "USD",
              availability: `https://schema.org/${trip.availability}`,
            },
            ...(trip.location
              ? {
                  itinerary: {
                    "@type": "Place",
                    name: trip.location,
                  },
                }
              : {}),
          },
        })),
      }}
    />
  );
}

interface EventItem {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: string;
  url: string;
}

export function EventsJsonLd({ events }: { events: EventItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Latina Community Events",
        itemListElement: events.map((ev, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Event",
            name: ev.name,
            description: ev.description,
            startDate: ev.startDate,
            ...(ev.endDate ? { endDate: ev.endDate } : {}),
            location: {
              "@type": "Place",
              name: ev.location,
            },
            url: ev.url,
            organizer: {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
            },
          },
        })),
      }}
    />
  );
}
