import type { SectionDef } from "./types";
import { HOME_SECTIONS } from "@/components/sections/home-sections";
import { TRIPS_SECTIONS } from "@/components/sections/trips-sections";
import { GALLERY_SECTIONS } from "@/components/sections/gallery-sections";
import { FAQ_SECTIONS } from "@/components/sections/faq-sections";
import { EVENTS_SECTIONS } from "@/components/sections/events-sections";
import { FEATURED_SECTIONS } from "@/components/sections/featured-sections";
import { CAMP_SECTIONS } from "@/components/sections/camp-sections";

/** Every registered section across all pages. */
export const ALL_SECTIONS: SectionDef[] = [
  ...HOME_SECTIONS,
  ...TRIPS_SECTIONS,
  ...GALLERY_SECTIONS,
  ...FAQ_SECTIONS,
  ...EVENTS_SECTIONS,
  ...FEATURED_SECTIONS,
  ...CAMP_SECTIONS,
];

const BY_TYPE = new Map<string, SectionDef>(ALL_SECTIONS.map((s) => [s.type, s]));

export function getSectionDef(type: string): SectionDef | undefined {
  return BY_TYPE.get(type);
}

const PAGE_MAP: Record<string, SectionDef[]> = {
  home: HOME_SECTIONS,
  trips: TRIPS_SECTIONS,
  gallery: GALLERY_SECTIONS,
  faq: FAQ_SECTIONS,
  events: EVENTS_SECTIONS,
  featured: FEATURED_SECTIONS,
  camp: CAMP_SECTIONS,
};

/** A page's OWN sections, in default order (empty if not yet decomposed). */
export function ownSectionsForPage(slug: string): SectionDef[] {
  return PAGE_MAP[slug] ?? [];
}

/** True once a page has been decomposed into editable sections. */
export function pageHasSections(slug: string): boolean {
  return (PAGE_MAP[slug]?.length ?? 0) > 0;
}

/** All sections grouped by their `group` label, for the library UI. */
export function sectionsByGroup(): { group: string; sections: SectionDef[] }[] {
  const groups = new Map<string, SectionDef[]>();
  for (const s of ALL_SECTIONS) {
    const list = groups.get(s.group) ?? [];
    list.push(s);
    groups.set(s.group, list);
  }
  return Array.from(groups, ([group, sections]) => ({ group, sections }));
}

/** A page uses the section pipeline if its first element is a section block. */
export function isSectionList(els: { type: string }[] | undefined): boolean {
  return !!els && els.length > 0 && els.every((e) => e.type.startsWith("section."));
}
