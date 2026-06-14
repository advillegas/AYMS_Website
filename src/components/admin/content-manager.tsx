"use client";

import { useState } from "react";
import { HomeContentPanel } from "./home-content-panel";
import { TestimonialsPanel } from "./testimonials-panel";
import { ExperiencesPanel } from "./experiences-panel";
import { GalleryPanel } from "./gallery-panel";
import { FaqPanel } from "./faq-panel";
import { MarqueePanel } from "./marquee-panel";

type Sub = "home" | "testimonials" | "experiences" | "gallery" | "faq" | "marquee";

const TABS: { id: Sub; label: string }[] = [
  { id: "home", label: "Homepage" },
  { id: "experiences", label: "Experiences" },
  { id: "testimonials", label: "Testimonials" },
  { id: "gallery", label: "Gallery" },
  { id: "faq", label: "FAQ" },
  { id: "marquee", label: "Marquee" },
];

export function ContentManager() {
  const [sub, setSub] = useState<Sub>("home");
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
        {sub === "experiences" && <ExperiencesPanel />}
        {sub === "testimonials" && <TestimonialsPanel />}
        {sub === "gallery" && <GalleryPanel />}
        {sub === "faq" && <FaqPanel />}
        {sub === "marquee" && <MarqueePanel />}
      </div>
    </div>
  );
}
