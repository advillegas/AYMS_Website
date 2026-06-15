"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrips } from "@/lib/use-trips";
import { EditableText } from "@/components/inline/editable-text";
import { EditableImage } from "@/components/inline/editable-image";

// Curated, aspirational gallery — imagery is editorial and stays fixed.
// Live trip counts are layered on top from the CRM (see countByCountry),
// so a destination only advertises "N trips" when admin-published trips
// actually exist for that country.
const DESTINATIONS = [
  { name: "Mexico", emoji: "🇲🇽", gradient: "from-[var(--magenta)] to-[#C44B3F]", image: "/trips/cancun-aug-26.jpg" },
  { name: "Colombia", emoji: "🇨🇴", gradient: "from-[#DAA520] to-[#C44B3F]", image: "/trips/colombia-dec-26.jpg" },
  { name: "Bali", emoji: "🏝️", gradient: "from-[#2D8B6F] to-[#DAA520]", image: "/trips/bali-jun-26.jpg" },
  { name: "Japan", emoji: "🇯🇵", gradient: "from-[var(--magenta)] to-[#FF6BA8]", image: "/trips/japan-nov-26.jpg" },
  { name: "Kenya", emoji: "🦁", gradient: "from-[#DAA520] to-[#8B4513]", image: "/trips/safari-jul-26.jpg" },
  { name: "Morocco", emoji: "🇲🇦", gradient: "from-[#C44B3F] to-[#DAA520]", image: "/trips/morocco-may-26.jpg" },
  { name: "Peru", emoji: "🇵🇪", gradient: "from-[#9B2C8A] to-[var(--magenta)]", image: "/destinations/peru.jpg" },
  { name: "Greece", emoji: "🇬🇷", gradient: "from-[#2D6BB8] to-[#2D8B6F]", image: "/destinations/greece.jpg" },
];

export function Destinations() {
  const prefersReducedMotion = useReducedMotion();
  const { trips } = useTrips();

  // Count published trips per country, keyed case-insensitively so a CRM
  // entry of "mexico" still matches the "Mexico" gallery tile.
  const countByCountry = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trips) {
      if (t.published === false) continue;
      const key = (t.country ?? "").trim().toLowerCase();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [trips]);

  return (
    <section className="canvas-editorial grain relative overflow-hidden py-28">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--magenta)]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <EditableText as="p" id="home.destinations.eyebrow" className="eyebrow text-[var(--brand-pink)]">Explore by Destination</EditableText>
          <h2 className="text-title mt-3 font-display text-ink text-balance">
            <EditableText as="span" id="home.destinations.title.before">Where will</EditableText>{" "}
            <EditableText as="span" id="home.destinations.title.accent" className="font-display-italic text-[var(--magenta)]">you go</EditableText>
            <EditableText as="span" id="home.destinations.title.after">?</EditableText>
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {DESTINATIONS.map((dest, i) => {
            const liveCount = countByCountry.get(dest.name.toLowerCase()) ?? 0;
            return (
              <motion.div
                key={dest.name}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: prefersReducedMotion ? 0 : i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href="/trips"
                  className="photo-card group block elevate-2"
                  aria-label={
                    liveCount > 0
                      ? `${dest.name} — ${liveCount} trip${liveCount !== 1 ? "s" : ""}`
                      : `${dest.name} — explore trips`
                  }
                >
                  <div className="photo-card-media aspect-[20/19]">
                    <div className={cn("photo-card-zoom grain absolute inset-0 bg-gradient-to-br", dest.gradient)}>
                      <EditableImage id={`home.destinations.${i}.image`} src={dest.image} alt={`${dest.name} — travel destination`} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" />
                      <div className="absolute inset-0 pattern-dots opacity-10" aria-hidden="true" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5" aria-hidden="true" />
                    </div>
                    <span className="absolute bottom-2.5 left-3 z-10 text-3xl drop-shadow-lg" aria-hidden="true">
                      {dest.emoji}
                    </span>
                    {liveCount > 0 ? (
                      <span className="pill-glass absolute left-3 top-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                        <Plane className="h-3 w-3" aria-hidden="true" />
                        {liveCount} trip{liveCount !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
                    <h3 className="min-w-0 truncate font-display text-base text-ink sm:text-lg">{dest.name}</h3>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm text-ink-soft">
                      <MapPin className="h-3.5 w-3.5 text-[var(--magenta)]" aria-hidden="true" />
                      Explore
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
