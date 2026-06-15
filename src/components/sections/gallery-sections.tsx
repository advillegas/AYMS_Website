"use client";

import type { SectionDef } from "@/lib/sections/types";
import { GalleryHero } from "@/components/sections/gallery/gallery-hero";
import { GalleryGrid } from "@/components/sections/gallery/gallery-grid";
import { GalleryStats } from "@/components/sections/gallery/gallery-stats";

/**
 * Gallery page section catalog. Each entry renders the real section body so the
 * published/edited page is pixel-identical to the coded design. Array order is
 * top-to-bottom page order (the seeds auto-generate from this). The past-trips
 * grid stays data-driven via `useGalleryContent()`; its list is managed through
 * the linked structured editor.
 */
export const GALLERY_SECTIONS: SectionDef[] = [
  {
    type: "section.gallery.hero",
    label: "Hero",
    group: "Gallery",
    description: "Editorial intro headline for the past-trips gallery.",
    Component: () => <GalleryHero />,
  },
  {
    type: "section.gallery.grid",
    label: "Past trips gallery",
    group: "Gallery",
    description: "Year filter and the masonry grid of past trips.",
    Component: () => <GalleryGrid />,
    manageHref: "/admin?tab=content&section=gallery",
    manageLabel: "Edit gallery",
  },
  {
    type: "section.gallery.stats",
    label: "Stats",
    group: "Gallery",
    description: "Trip totals and community milestones.",
    Component: () => <GalleryStats />,
  },
];
