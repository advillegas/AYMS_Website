"use client";

import type { SectionDef } from "@/lib/sections/types";
import { CampHero } from "@/components/sections/camp/camp-hero";
import { CampAbout } from "@/components/sections/camp/camp-about";
import { CampFeatures } from "@/components/sections/camp/camp-features";
import { CampGallery } from "@/components/sections/camp/camp-gallery";
import { CampInclusions } from "@/components/sections/camp/camp-inclusions";
import { CampTestimonials } from "@/components/sections/camp/camp-testimonials";
import { CampCta } from "@/components/sections/camp/camp-cta";

/**
 * Camp page section catalog. Each entry renders the real camp section so the
 * published/edited page is pixel-identical to the coded design. Copy is edited
 * inline (click on the canvas); images are swapped via the inline image slots.
 * Array order == page order.
 */
export const CAMP_SECTIONS: SectionDef[] = [
  {
    type: "section.camp.hero",
    label: "Hero",
    group: "Camp",
    description: "Logo, headline, key facts, checkout CTAs and the hero photo.",
    Component: () => <CampHero />,
  },
  {
    type: "section.camp.about",
    label: "About",
    group: "Camp",
    description: "The 'What is Amigas Summer Camp?' intro copy and photo grid.",
    Component: () => <CampAbout />,
  },
  {
    type: "section.camp.features",
    label: "Feature flip-cards",
    group: "Camp",
    description: "Four bilingual flip-cards over the textured background.",
    Component: () => <CampFeatures />,
  },
  {
    type: "section.camp.gallery",
    label: "Gallery band",
    group: "Camp",
    description: "'Sunshine. Adventure. Amigas.' photo pair.",
    Component: () => <CampGallery />,
  },
  {
    type: "section.camp.inclusions",
    label: "Inclusions & Activities",
    group: "Camp",
    description: "What's included plus the activities lineup and photo.",
    Component: () => <CampInclusions />,
  },
  {
    type: "section.camp.testimonials",
    label: "Testimonials",
    group: "Camp",
    description: "Three member testimonials with star ratings.",
    Component: () => <CampTestimonials />,
  },
  {
    type: "section.camp.cta",
    label: "Final CTA",
    group: "Camp",
    description: "Closing call-to-action, checkout buttons and photo grid.",
    Component: () => <CampCta />,
  },
];
