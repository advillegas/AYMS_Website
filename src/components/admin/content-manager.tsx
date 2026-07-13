"use client";

import { useState } from "react";
import { HomeContentPanel } from "./home-content-panel";
import { TestimonialsPanel } from "./testimonials-panel";
import { ExperiencesPanel } from "./experiences-panel";
import { GalleryPanel } from "./gallery-panel";
import { FaqPanel } from "./faq-panel";
import { MarqueePanel } from "./marquee-panel";
import { FlipCardListPanel } from "./flip-card-list-panel";
import { ContactLinksPanel } from "./contact-links-panel";
import { LinksPagePanel } from "./links-page-panel";
import { DestinationsPanel } from "./destinations-panel";
import { ChatbotPanel } from "./chatbot-panel";
import { DEFAULT_WHYUS, DEFAULT_VALUES, DEFAULT_PILLARS } from "@/lib/use-site-content";

type Sub =
  | "home"
  | "pillars"
  | "whyus"
  | "values"
  | "testimonials"
  | "experiences"
  | "gallery"
  | "faq"
  | "marquee"
  | "contact"
  | "links"
  | "destinations"
  | "chatbot";

const TABS: { id: Sub; label: string }[] = [
  { id: "home", label: "Homepage" },
  { id: "pillars", label: "Hero cards" },
  { id: "whyus", label: "Why-Us cards" },
  { id: "values", label: "Value cards" },
  { id: "destinations", label: "Destinations" },
  { id: "experiences", label: "Experiences" },
  { id: "testimonials", label: "Testimonials" },
  { id: "gallery", label: "Gallery" },
  { id: "faq", label: "FAQ" },
  { id: "marquee", label: "Marquee" },
  { id: "contact", label: "Contact" },
  { id: "links", label: "Links page" },
  { id: "chatbot", label: "Chatbot" },
];

const VALID_SUBS: Sub[] = [
  "home",
  "pillars",
  "whyus",
  "values",
  "testimonials",
  "experiences",
  "gallery",
  "faq",
  "marquee",
  "contact",
  "links",
  "destinations",
  "chatbot",
];

export function ContentManager({ section }: { section?: Sub }) {
  // Mounted client-side only (admin gates on hydration), so the fresh-load
  // deep link (/admin?tab=content&section=gallery) can seed initial state.
  const [sub, setSub] = useState<Sub>(() => {
    if (typeof window !== "undefined") {
      const s = new URLSearchParams(window.location.search).get("section");
      if (s && VALID_SUBS.includes(s as Sub)) return s as Sub;
    }
    return section && VALID_SUBS.includes(section) ? section : "home";
  });

  // Open the requested panel when the parent routes here ("edit this page"),
  // so it lands on the right editor instead of always defaulting to Homepage.
  // Render-time adjustment instead of an effect — no cascading re-renders.
  const [prevSection, setPrevSection] = useState(section);
  if (section !== prevSection) {
    setPrevSection(section);
    if (section && VALID_SUBS.includes(section)) setSub(section);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1 border-b border-white/10 bg-[#220a18] px-4 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`rounded-t-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              sub === t.id
                ? "bg-[#1A0814] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {sub === "home" && <HomeContentPanel />}
        {sub === "pillars" && (
          <FlipCardListPanel
            contentKey="home.pillars"
            defaults={DEFAULT_PILLARS}
            title="Hero — pillar cards"
            itemLabel="card"
          />
        )}
        {sub === "whyus" && (
          <FlipCardListPanel
            contentKey="home.whyus"
            defaults={DEFAULT_WHYUS}
            title="Why Travel With Us — cards"
            itemLabel="card"
          />
        )}
        {sub === "values" && (
          <FlipCardListPanel
            contentKey="home.values"
            defaults={DEFAULT_VALUES}
            title="About — value cards"
            itemLabel="card"
            showIconColor
          />
        )}
        {sub === "experiences" && <ExperiencesPanel />}
        {sub === "testimonials" && <TestimonialsPanel />}
        {sub === "gallery" && <GalleryPanel />}
        {sub === "faq" && <FaqPanel />}
        {sub === "marquee" && <MarqueePanel />}
        {sub === "contact" && <ContactLinksPanel />}
        {sub === "links" && <LinksPagePanel />}
        {sub === "destinations" && <DestinationsPanel />}
        {sub === "chatbot" && <ChatbotPanel />}
      </div>
    </div>
  );
}
