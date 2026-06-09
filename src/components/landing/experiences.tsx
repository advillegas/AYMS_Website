"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

const EXPERIENCES = [
  { title: "Cenote Swimming in the Yucatán", location: "Mexico", emoji: "🏊‍♀️", gradient: "from-[#2D8B6F] to-[#1a5c4a]" },
  { title: "Cooking Class in Cartagena", location: "Colombia", emoji: "🍳", gradient: "from-[#DAA520] to-[#8B6914]" },
  { title: "Sunrise Safari Drive", location: "Kenya", emoji: "🦒", gradient: "from-[#C44B3F] to-[#8B3029]" },
  { title: "Wine Tasting in Napa Valley", location: "California", emoji: "🍷", gradient: "from-[#9B2C8A] to-[#6B1D5E]" },
  { title: "Salsa Night in Medellín", location: "Colombia", emoji: "💃", gradient: "from-[#FF0099] to-[#B8306A]" },
  { title: "Temple Visit in Kyoto", location: "Japan", emoji: "⛩️", gradient: "from-[#B51760] to-[#9B2C8A]" },
];

export function Experiences() {
  const prefersReducedMotion = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const amount = Math.min(rail.clientWidth * 0.8, 360);
    rail.scrollBy({ left: dir * amount, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  return (
    <section className="canvas-warm grain relative overflow-hidden py-28">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-2xl">
            <p className="eyebrow text-[#FF0099]">Bucket List</p>
            <h2 className="text-title mt-3 font-display text-ink text-balance">
              Unforgettable{" "}
              <span className="font-display-italic text-[#B51760]">experiences</span>
            </h2>
            <p className="text-lead mt-4 text-ink-soft">
              Every trip is packed with curated activities that you&apos;ll
              remember forever. Here are just a few.
            </p>
          </div>

          {/* Glass arrow controls for the rail */}
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              className="glass-control h-11 w-11"
              aria-label="Scroll experiences left"
            >
              <ChevronLeft className="h-5 w-5 text-ink" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              className="glass-control h-11 w-11"
              aria-label="Scroll experiences right"
            >
              <ChevronRight className="h-5 w-5 text-ink" aria-hidden="true" />
            </button>
          </div>
        </motion.div>

        {/* Horizontal scroll-snap rail */}
        <div
          ref={railRef}
          className="mt-12 flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {EXPERIENCES.map((exp, i) => (
            <motion.div
              key={exp.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: prefersReducedMotion ? 0 : i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 w-72 snap-start sm:w-80"
            >
              <article className="photo-card group elevate-2 cursor-default">
                <div
                  className={`photo-card-media photo-card-zoom aspect-[20/19] grain bg-gradient-to-br ${exp.gradient}`}
                >
                  <div className="absolute inset-0 pattern-dots opacity-10" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  <span className="absolute inset-0 flex items-center justify-center text-6xl drop-shadow-lg transition-transform duration-500 group-hover:scale-110" aria-hidden="true">
                    {exp.emoji}
                  </span>
                  <span className="pill-glass absolute left-3 top-3 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {exp.location}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg leading-snug text-ink">
                    {exp.title}
                  </h3>
                </div>
              </article>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
