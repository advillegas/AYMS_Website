"use client";

import type { SectionDef } from "@/lib/sections/types";
import { FeaturedSpotlightSection } from "@/components/sections/featured/featured-spotlight-section";

/**
 * /featured page section catalog. The page is a single cohesive spotlight
 * (next featured trip + upcoming events + newsletter capture) whose two grid
 * columns share the spotlight trip's state, so it stays one section — the
 * builder can still hide / duplicate / reorder it and edit the linked event
 * data. Rendering the real component keeps the published page pixel-identical.
 */
export const FEATURED_SECTIONS: SectionDef[] = [
  {
    type: "section.featured.spotlight",
    label: "Featured Spotlight",
    group: "Featured",
    description:
      "Next featured trip, the upcoming-events list and the newsletter capture — all pulled live from the trips & events data.",
    Component: FeaturedSpotlightSection,
    manageHref: "/admin?tab=events",
    manageLabel: "Manage events",
  },
];
