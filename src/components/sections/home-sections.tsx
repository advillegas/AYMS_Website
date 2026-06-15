"use client";

import type { SectionDef } from "@/lib/sections/types";
import { Hero } from "@/components/landing/hero";
import { Marquee } from "@/components/landing/marquee";
import { About } from "@/components/landing/about";
import { WhyUs } from "@/components/landing/why-us";
import { Destinations } from "@/components/landing/destinations";
import { Camp } from "@/components/landing/camp";
import { Trips } from "@/components/landing/trips";
import { Experiences } from "@/components/landing/experiences";
import { Testimonials } from "@/components/landing/testimonials";
import { CommunityPreview } from "@/components/landing/community-preview";
import { Contact } from "@/components/landing/contact";

/**
 * Home page section catalog. Each entry renders the actual landing component,
 * so the published/edited page is pixel-identical to the coded design. Text
 * and images are edited inline (click on the canvas); list data (trips,
 * testimonials, experiences, ...) is managed via the linked structured editors.
 */
export const HOME_SECTIONS: SectionDef[] = [
  {
    type: "section.home.hero",
    label: "Hero",
    group: "Home",
    description: "Rotating headline, intro, CTAs and the three pillar cards.",
    Component: () => <Hero />,
    manageHref: "/admin?tab=content&section=home",
    manageLabel: "Edit headlines & stats",
  },
  {
    type: "section.home.marquee",
    label: "Marquee strip",
    group: "Home",
    description: "Scrolling words ribbon.",
    Component: () => <Marquee />,
    manageHref: "/admin?tab=content&section=marquee",
    manageLabel: "Edit marquee words",
  },
  {
    type: "section.home.about",
    label: "About / Values",
    group: "Home",
    description: "About copy, value flip-cards and the founder spotlight.",
    Component: () => <About />,
  },
  {
    type: "section.home.whyus",
    label: "Why Travel With Us",
    group: "Home",
    description: "Six reason flip-cards.",
    Component: () => <WhyUs />,
  },
  {
    type: "section.home.destinations",
    label: "Destinations",
    group: "Home",
    description: "Destination gallery with live trip counts.",
    Component: () => <Destinations />,
    manageHref: "/community/admin/trips",
    manageLabel: "Manage trips (counts)",
  },
  {
    type: "section.home.camp",
    label: "Summer Camp teaser",
    group: "Home",
    description: "Amigas Summer Camp promo block.",
    Component: () => <Camp />,
  },
  {
    type: "section.home.trips",
    label: "Trips grid",
    group: "Home",
    description: "Upcoming trips pulled live from the trips CRM.",
    Component: () => <Trips />,
    manageHref: "/community/admin/trips",
    manageLabel: "Manage trips",
  },
  {
    type: "section.home.experiences",
    label: "Experiences rail",
    group: "Home",
    description: "Auto-scrolling bucket-list experiences.",
    Component: () => <Experiences />,
    manageHref: "/admin?tab=content&section=experiences",
    manageLabel: "Edit experiences",
  },
  {
    type: "section.home.testimonials",
    label: "Testimonials",
    group: "Home",
    description: "Auto-scrolling member testimonials.",
    Component: () => <Testimonials />,
    manageHref: "/admin?tab=content&section=testimonials",
    manageLabel: "Edit testimonials",
  },
  {
    type: "section.home.community",
    label: "Community preview",
    group: "Home",
    description: "Stats, highlights and the upcoming-events ticker.",
    Component: () => <CommunityPreview />,
    manageHref: "/community/admin/calendar",
    manageLabel: "Manage events",
  },
  {
    type: "section.home.contact",
    label: "Contact / Newsletter",
    group: "Home",
    description: "Contact cards and the newsletter signup.",
    Component: () => <Contact />,
  },
];
