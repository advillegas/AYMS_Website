"use client";

import { FeaturedSpotlight } from "@/components/landing/featured-spotlight";

/**
 * Builder section for the /featured page body.
 *
 * The live FeaturedSpotlight is a single cohesive block: a shared heading
 * plus a `lg:grid-cols-5` grid whose spotlight trip card and "coming up" /
 * newsletter sidebar sit side-by-side AND share one piece of state — the
 * spotlight `trip` (used by the card, the sidebar's responsive column span,
 * and the newsletter capture's `tripId`). Splitting it into separate
 * full-bleed sections would stack those columns and break the shared trip,
 * so per the section contract it stays a single section. We render the real
 * component untouched, so the design stays pixel-identical and all
 * interactivity (data hooks, framer-motion, newsletter form) is preserved.
 * Trip + events remain fully data-driven via useTrips()/useEvents() inside it.
 */
export function FeaturedSpotlightSection() {
  return <FeaturedSpotlight />;
}
