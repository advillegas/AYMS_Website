"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useGalleryContent } from "@/lib/use-site-content";
import { MapPin, Users, Calendar, Images, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "@/components/inline/editable-text";

const YEARS = ["All", "2026", "2025", "2024"] as const;

const GRADIENTS = [
  "from-[#FF0099] via-[#B51760] to-[#9B2C8A]",
  "from-[#9B2C8A] via-[#FF0099] to-[#FF6BA8]",
  "from-[#C44B3F] via-[#B51760] to-[#FF0099]",
  "from-[#B51760] via-[#9B2C8A] to-[#6A1B4D]",
  "from-[#FF0099] via-[#C44B3F] to-[#B51760]",
  "from-[#6A1B4D] via-[#FF0099] to-[#B51760]",
];

/**
 * Year filter + masonry grid of past trips. These share the `yearFilter`
 * state (the sticky filter drives the grid and its result count), so they
 * live in one section. Grid data is driven by `useGalleryContent()`.
 */
export function GalleryGrid() {
  const [yearFilter, setYearFilter] = useState<string>("All");
  const reduceMotion = useReducedMotion();
  const { pastTrips } = useGalleryContent();

  const filtered = pastTrips.filter(
    (t) => yearFilter === "All" || t.year.toString() === yearFilter,
  );

  return (
    <>
      {/* Year filter */}
      <section className="glass-nav border-b border-[#221019]/10 sticky top-[88px] z-10">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYearFilter(y)}
              aria-pressed={yearFilter === y}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]",
                yearFilter === y
                  ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-md shadow-[#FF0099]/20"
                  : "text-ink-soft hover:bg-[#FF0099]/5 hover:text-[#B51760]",
              )}
            >
              {y}
            </button>
          ))}
          <div className="ml-auto text-sm text-ink-soft">
            {filtered.length} trip{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      </section>

      {/* Gallery grid — editorial masonry */}
      <section className="relative py-14 canvas-editorial">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((trip, i) => {
                const grad = GRADIENTS[i % GRADIENTS.length];
                const tall = i % 3 === 0;
                return (
                  <motion.figure
                    key={trip.title}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-5 break-inside-avoid"
                  >
                    <div
                      role="img"
                      aria-label={`${trip.title} — ${trip.location}, ${trip.amigas} amigas, ${trip.year}`}
                      className="photo-card group block"
                    >
                      <div
                        className={cn(
                          `photo-card-media grain bg-gradient-to-br ${grad}`,
                          tall ? "aspect-[3/4]" : "aspect-[4/3]",
                        )}
                      >
                        {/* zoom layer for the Airbnb-style hover scale —
                            real location photo over the gradient fallback */}
                        <div className="photo-card-zoom absolute inset-0" aria-hidden="true">
                          <Image
                            src={trip.image}
                            alt={trip.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 pattern-dots opacity-[0.12]" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                        {/* glass heart-save control */}
                        <span className="glass-control absolute right-3 top-3 h-9 w-9" aria-hidden="true">
                          <Heart className="h-4 w-4 text-[#B51760]" />
                        </span>

                        {/* year pill */}
                        <span className="pill-glass absolute left-3 top-3 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white">
                          <Calendar className="h-2.5 w-2.5" aria-hidden="true" />
                          {trip.year}
                        </span>

                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                          <span className="mb-3 text-5xl drop-shadow-lg transition-transform group-hover:scale-110" aria-hidden="true">
                            {trip.emoji}
                          </span>
                          <h3 className="font-display text-xl text-white drop-shadow-lg">
                            {trip.title}
                          </h3>
                        </div>

                        <figcaption className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center justify-between text-xs text-white/85">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {trip.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" aria-hidden="true" />
                              {trip.amigas} amigas
                            </span>
                          </div>
                        </figcaption>
                      </div>
                    </div>
                  </motion.figure>
                );
              })}
            </AnimatePresence>
          </div>

          {filtered.length === 0 && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="glass-control mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                <Images className="h-7 w-7 text-ink-soft/60" aria-hidden="true" />
              </div>
              <p className="font-display text-lg text-ink">
                <EditableText as="span" id="gallery.empty.titleBefore">No trips from</EditableText>{" "}
                {yearFilter}{" "}
                <EditableText as="span" id="gallery.empty.titleAfter">to show yet</EditableText>
              </p>
              <EditableText as="p" id="gallery.empty.subtitle" className="mt-1 text-sm text-ink-soft">
                Pick another year to relive the memories ♡
              </EditableText>
            </motion.div>
          )}
        </div>
      </section>
    </>
  );
}
