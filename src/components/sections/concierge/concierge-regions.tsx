"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Loader2 } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";
import type { ChapterRegion } from "./chapters-map";

/**
 * "How AYMS is divided & where to find your amigas" — adapts the brand
 * regional map into the site's palette: a flat line-art US map with
 * magenta region pills, plus a responsive card grid (cities + Instagram)
 * so it's legible and actionable on every screen.
 */

const ChaptersMap = dynamic(() => import("./chapters-map"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl border border-rosa/25 bg-[#FFF1F8] sm:aspect-[16/9]">
      <Loader2 className="h-6 w-6 animate-spin text-[#B51760]" />
    </div>
  ),
});

interface Region extends ChapterRegion {
  name: string;
  cities: string;
}

const REGIONS: Region[] = [
  { id: "nw", name: "AYMS North West", short: "North West", cities: "Portland, Seattle", ig: "aymsnorthwest", coordinates: [-120.5, 47.5] },
  { id: "norcal", name: "AYMS NorCal", short: "NorCal", cities: "SF, SJ, Oakland, Fresno", ig: "aymsnorcal", coordinates: [-123.0, 39.5] },
  { id: "socal", name: "AYMS SoCal", short: "SoCal", cities: "LA, LB, South Bay, Valleys, SGB, IE, OC & SD", ig: "aymssocal", coordinates: [-118.6, 34.0] },
  { id: "sw", name: "AYMS South West", short: "South West", cities: "Phoenix, Denver", ig: "aymssouthwest", coordinates: [-110.5, 36.6] },
  { id: "chicago", name: "AYMS Chicago", short: "Chicago", cities: "Chicago", ig: "aymschicago", coordinates: [-88.5, 42.6] },
  { id: "south", name: "AYMS South", short: "South", cities: "Houston, Dallas, San Antonio, Austin", ig: "aymssouth", coordinates: [-98.5, 31.0] },
  { id: "ne", name: "AYMS North East", short: "North East", cities: "NY, NJ, MA", ig: "aymsnortheast", coordinates: [-72.0, 43.6] },
  { id: "se", name: "AYMS South East", short: "South East", cities: "Florida, SC, NC", ig: "aymssoutheast", coordinates: [-80.8, 33.6] },
];

function IgGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function ConciergeRegions() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="canvas-warm grain relative overflow-hidden border-t border-[#221019]/8 py-20 sm:py-24">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <EditableText as="p" id="concierge.regions.eyebrow" className="eyebrow text-[var(--brand-pink)]">
            Coast to coast
          </EditableText>
          <h2 className="font-display text-title mt-3 text-ink text-balance">
            <EditableText as="span" id="concierge.regions.title">How AYMS is divided —</EditableText>{" "}
            <EditableText as="span" id="concierge.regions.titleAccent" className="font-display-italic text-[var(--magenta)]">
              and where to find your amigas
            </EditableText>
          </h2>
          <EditableText as="p" id="concierge.regions.lead" className="mx-auto mt-4 max-w-xl text-lead text-ink-soft">
            Wherever you are, there&apos;s an amiga — and your concierge — nearby.
            Find your region, then follow along on Instagram.
          </EditableText>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10"
        >
          <ChaptersMap regions={REGIONS} />
          <p className="mt-2 text-center text-[11px] text-ink-soft">
            Tap a region pin to follow that chapter on Instagram.
          </p>
        </motion.div>

        {/* Region cards — full detail + Instagram, great on mobile */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REGIONS.map((r, i) => (
            <motion.a
              key={r.id}
              href={`https://instagram.com/${r.ig}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="lift group flex flex-col rounded-2xl border border-[#221019]/8 bg-white/70 p-5 transition-all elevate-2 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--magenta)]/15 to-[var(--brand-pink)]/10 text-[var(--magenta)]">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="font-display text-base text-ink group-hover:text-[#B51760]">
                  {r.name}
                </h3>
              </div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-soft">
                {r.cities}
              </p>
              <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--magenta)]/8 px-2.5 py-1 text-[11px] font-semibold text-[#B51760] transition-colors group-hover:bg-[var(--magenta)]/15">
                <IgGlyph className="h-3.5 w-3.5" />
                @{r.ig}
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
