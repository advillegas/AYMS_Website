import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo-config";

/**
 * Per-route metadata for /concierge. The page itself is a Client
 * Component, so SEO lives here in the co-located Server layout (App Router
 * reads metadata from Server Components only). Falls back to coded
 * defaults; the owner can override title/description in Admin → SEO.
 */
export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("concierge", {
    title: "Private Trip Planning & Concierge",
    description:
      "Hand your dream trip to a planner who treats it like their own. " +
      "AYMS designs and books fully custom getaways for Latinas — flights, stays, " +
      "activities, and 24/7 support — so you travel effortlessly. Request your consultation.",
    canonical: "/concierge",
  });
}

export default function ConciergeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
