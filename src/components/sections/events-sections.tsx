"use client";

import type { SectionDef } from "@/lib/sections/types";
import { EventsHero } from "@/components/sections/events/events-hero";
import { EventsBody } from "@/components/sections/events/events-body";
import { EventsCta } from "@/components/sections/events/events-cta";

/**
 * Events page section catalog. Each entry renders the real events component so
 * the published/edited page is pixel-identical to the coded design. Hero and
 * CTA copy is edited inline (click on the canvas); the events list is live
 * (useEvents) and managed via the community calendar admin.
 */
export const EVENTS_SECTIONS: SectionDef[] = [
  {
    type: "section.events.hero",
    label: "Hero",
    group: "Events",
    description: "Editorial intro headline and subtext.",
    Component: () => <EventsHero />,
  },
  {
    type: "section.events.body",
    label: "Filters & events list",
    group: "Events",
    description: "Type filters, the upcoming-events timeline, and the RSVP/detail dialog.",
    Component: () => <EventsBody />,
    manageHref: "/admin?tab=events",
    manageLabel: "Manage events",
  },
  {
    type: "section.events.cta",
    label: "Calendar CTA",
    group: "Events",
    description: "Closing call-to-action linking to the community calendar.",
    Component: () => <EventsCta />,
  },
];
