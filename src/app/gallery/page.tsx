"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PAST_TRIPS } from "@/lib/trips-data";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";

const YEARS = ["All", "2026", "2025", "2024"] as const;

const GRADIENTS = [
  "from-[#FF0099] via-[#B51760] to-[#9B2C8A]",
  "from-[#9B2C8A] via-[#FF0099] to-[#FF6BA8]",
  "from-[#C44B3F] via-[#B51760] to-[#FF0099]",
  "from-[#B51760] via-[#9B2C8A] to-[#6A1B4D]",
  "from-[#FF0099] via-[#C44B3F] to-[#B51760]",
  "from-[#6A1B4D] via-[#FF0099] to-[#B51760]",
];

export default function GalleryPage() {
  const [yearFilter, setYearFilter] = useState<string>("All");
  const reduceMotion = useReducedMotion();

  const filtered = PAST_TRIPS.filter(
    (t) => yearFilter === "All" || t.year.toString() === yearFilter,
  );

  return (
    <CmsPageWrapper slug="gallery">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero */}
        <section className="grain relative overflow-hidden bg-[#1a0a12] py-28">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] via-[#1a0a12] to-[#1A0814]" />
          <div className="aurora opacity-50" />
          <div className="absolute inset-0 pattern-dots opacity-[0.07]" />
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
          >
            <motion.div
              initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-[0_0_32px_rgb(255_0_153/0.25)]"
            >
              <Images className="h-8 w-8 text-[#FFB3D0]" aria-hidden="true" />
            </motion.div>
            <div className="mx-auto mb-6 flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 backdrop-blur-md">
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#FFB3D0]">
                Memories for the Books
              </span>
            </div>
            <h1 className="text-hero font-[family-name:var(--font-heading)] font-extrabold text-white text-balance">
              Past{" "}
              <span className="text-gradient-brand">Trips</span>
            </h1>
            <p className="text-lead mx-auto mt-6 max-w-xl text-white/60">
              Where we&apos;ve been, who we&apos;ve become. Every trip builds
              bonds that last a lifetime.
            </p>
          </motion.div>
        </section>

        {/* Year filter */}
        <section className="border-b border-rosa/15 bg-background/95 backdrop-blur-sm sticky top-[88px] z-10">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYearFilter(y)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]",
                  yearFilter === y
                    ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                )}
              >
                {y}
              </button>
            ))}
            <div className="ml-auto text-sm text-muted-foreground">
              {filtered.length} trip{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </section>

        {/* Gallery grid — masonry-like */}
        <section className="relative py-14">
          <div className="absolute inset-0 pattern-grid opacity-[0.07]" />
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
                        className={cn(
                          `lift group relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} border border-white/15 elevate-3`,
                          tall ? "aspect-[3/4]" : "aspect-[4/3]",
                        )}
                      >
                        <div className="absolute inset-0 pattern-dots opacity-[0.12]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                          <span className="text-5xl mb-3 transition-transform group-hover:scale-110 drop-shadow-lg" aria-hidden="true">
                            {trip.emoji}
                          </span>
                          <h3 className="text-xl font-bold font-[family-name:var(--font-heading)] drop-shadow-lg">
                            {trip.title}
                          </h3>
                        </div>

                        <figcaption className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center justify-between text-xs text-white/80">
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

                        <Badge className="absolute top-3 right-3 bg-white/15 text-white border-white/20 text-[10px] font-bold backdrop-blur-sm">
                          <Calendar className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                          {trip.year}
                        </Badge>
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
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass elevate-2">
                  <Images className="h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
                </div>
                <p className="text-lg font-semibold font-[family-name:var(--font-heading)]">
                  No trips from {yearFilter} to show yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pick another year to relive the memories ♡
                </p>
              </motion.div>
            )}
          </div>
        </section>

        {/* Stats */}
        <section className="relative overflow-hidden border-t border-rosa/15 py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-rosa/8 via-background to-background" />
          <div className="absolute inset-0 pattern-dots opacity-[0.05]" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
              {[
                { value: PAST_TRIPS.length + "+", label: "Trips Completed" },
                { value: PAST_TRIPS.reduce((s, t) => s + t.amigas, 0) + "+", label: "Amigas Traveled" },
                { value: "10+", label: "Countries Visited" },
                { value: "∞", label: "Memories Made" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="lift glass rounded-2xl py-8 px-4 elevate-2"
                >
                  <p className="text-4xl font-extrabold text-gradient-brand font-[family-name:var(--font-heading)]">
                    {s.value}
                  </p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
