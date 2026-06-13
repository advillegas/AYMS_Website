"use client";

import { useState } from "react";
import { HomeContentPanel } from "./home-content-panel";
import { TestimonialsPanel } from "./testimonials-panel";

type Sub = "home" | "testimonials";

const TABS: { id: Sub; label: string }[] = [
  { id: "home", label: "Homepage" },
  { id: "testimonials", label: "Testimonials" },
];

export function ContentManager() {
  const [sub, setSub] = useState<Sub>("home");
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-white/10 bg-[#220a18] px-4 pt-2">
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
        {sub === "home" ? <HomeContentPanel /> : <TestimonialsPanel />}
      </div>
    </div>
  );
}
