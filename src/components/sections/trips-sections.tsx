"use client";

import type { SectionDef } from "@/lib/sections/types";
import { TripsHero } from "@/components/sections/trips/trips-hero";
import { TripsGrid } from "@/components/sections/trips/trips-grid";
import { TripsHowTo } from "@/components/sections/trips/trips-howto";

/**
 * Trips page section catalog. Each entry renders the real page component, so
 * the published/edited page is pixel-identical to the coded design. Array order
 * is the top-to-bottom page order. Trip cards come from the live trips CRM
 * (useTrips); section text/headings are edited inline on the canvas.
 */
export const TRIPS_SECTIONS: SectionDef[] = [
  {
    type: "section.trips.hero",
    label: "Hero",
    group: "Trips",
    description: "Editorial hero banner with the page eyebrow, headline and intro.",
    Component: () => <TripsHero />,
  },
  {
    type: "section.trips.grid",
    label: "Trips grid",
    group: "Trips",
    description: "Region filters, the limited-spots rail, the live trips grid and the trip-detail dialog.",
    Component: () => <TripsGrid />,
    manageHref: "/community/admin/trips",
    manageLabel: "Manage trips",
  },
  {
    type: "section.trips.howto",
    label: "How to Book",
    group: "Trips",
    description: "Four-step booking guide.",
    Component: () => <TripsHowTo />,
  },
];
