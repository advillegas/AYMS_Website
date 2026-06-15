"use client";

import type { SectionDef } from "@/lib/sections/types";
import { FaqHero } from "@/components/sections/faq/faq-hero";
import { FaqList } from "@/components/sections/faq/faq-list";
import { FaqCta } from "@/components/sections/faq/faq-cta";

/**
 * FAQ page section catalog. Each entry renders the real /faq component so the
 * published/edited page stays pixel-identical to the coded design. The Q&A are
 * data-driven (`useFaqContent`) and managed via the linked content editor.
 */
export const FAQ_SECTIONS: SectionDef[] = [
  {
    type: "section.faq.hero",
    label: "Hero",
    group: "FAQ",
    description: "Page title, intro line and the help icon.",
    Component: () => <FaqHero />,
  },
  {
    type: "section.faq.list",
    label: "Questions & search",
    group: "FAQ",
    description: "Sticky search box and the categorized, filterable accordion.",
    Component: () => <FaqList />,
    manageHref: "/admin?tab=content&section=faq",
    manageLabel: "Edit FAQ",
  },
  {
    type: "section.faq.cta",
    label: "Still-have-questions CTA",
    group: "FAQ",
    description: "Closing glass card with the contact + browse-trips buttons.",
    Component: () => <FaqCta />,
  },
];
