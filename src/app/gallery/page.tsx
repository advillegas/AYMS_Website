"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PAST_TRIPS } from "@/lib/trips-data";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const YEARS = ["All", "2026", "2025", "2024"] as const;

const GRADIENTS = [
  "from-[#E8458B] via-[#D4357A] to-[#9B2C8A]",
  "from-[#DAA520] via-[#C44B3F] to-[#E8458B]",
  "from-[#9B2C8A] via-[#E8458B] to-[#FF6BA8]",
  "from-[#C44B3F] via-[#DAA520] to-[#2D8B6F]",
  "from-[#2D8B6F] via-[#DAA520] to-[#E8458B]",
  "from-[#D4357A] via-[#9B2C8A] to-[#6B3FA0]",
];

export default function GalleryPage() {
  const [yearFilter, setYearFilter] = useState<string>("All");

  const filtered = PAST_TRIPS.filter(
    (t) => yearFilter === "All" || t.year.toString() === yearFilter,
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#1a0a12] py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1f0d16] to-[#0d060a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,oklch(0.40_0.14_340/0.15),transparent)]" />
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#FFB3D0]">
              Memories for the Books
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-heading)] text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              Past{" "}
              <span className="bg-gradient-to-r from-[#FFB3D0] via-[#E8458B] to-[#D4A56A] bg-clip-text text-transparent">
                Trips
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-white/50">
              Where we&apos;ve been, who we&apos;ve become. Every trip builds
              bonds that last a lifetime.
            </p>
          </div>
        </section>

        {/* Year filter */}
        <section className="border-b border-rosa/15 bg-background">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYearFilter(y)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  yearFilter === y
                    ? "bg-primary text-white shadow-md shadow-primary/20"
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
        <section className="relative py-12">
          <div className="absolute inset-0 pattern-grid opacity-10" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((trip, i) => {
                  const grad = GRADIENTS[i % GRADIENTS.length];
                  const tall = i % 3 === 0;
                  return (
                    <motion.div
                      key={trip.title}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      className="mb-5 break-inside-avoid"
                    >
                      <div
                        className={cn(
                          `group relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} border border-white/10 transition-all hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1`,
                          tall ? "aspect-[3/4]" : "aspect-[4/3]",
                        )}
                      >
                        <div className="absolute inset-0 pattern-dots opacity-10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                          <span className="text-5xl mb-3 transition-transform group-hover:scale-110">
                            {trip.emoji}
                          </span>
                          <h3 className="text-xl font-bold font-[family-name:var(--font-heading)] drop-shadow-lg">
                            {trip.title}
                          </h3>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center justify-between text-xs text-white/70">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {trip.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {trip.amigas} amigas
                            </span>
                          </div>
                        </div>

                        <Badge className="absolute top-3 right-3 bg-white/15 text-white border-white/20 text-[10px] font-bold backdrop-blur-sm">
                          <Calendar className="h-2.5 w-2.5 mr-1" />
                          {trip.year}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-t border-rosa/15 bg-gradient-to-b from-rosa/5 to-background py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
              {[
                { value: PAST_TRIPS.length + "+", label: "Trips Completed" },
                { value: PAST_TRIPS.reduce((s, t) => s + t.amigas, 0) + "+", label: "Amigas Traveled" },
                { value: "10+", label: "Countries Visited" },
                { value: "∞", label: "Memories Made" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-magenta bg-clip-text text-transparent font-[family-name:var(--font-heading)]">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
