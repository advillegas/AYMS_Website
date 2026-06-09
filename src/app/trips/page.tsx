"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TRIPS_DATA, type Trip } from "@/lib/trips-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReserveButton } from "@/components/trips/reserve-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  Sparkles,
  CreditCard,
  ArrowRight,
  Plane,
} from "lucide-react";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  available: { label: "Book Now", cls: "bg-white/90 text-green-700 border-white/50 backdrop-blur-sm shadow-sm" },
  "sold-out": { label: "Sold Out", cls: "bg-white/90 text-red-600 border-white/50 backdrop-blur-sm shadow-sm" },
  waitlist: { label: "Join Waitlist", cls: "bg-white/90 text-amber-700 border-white/50 backdrop-blur-sm shadow-sm" },
  "coming-soon": { label: "Coming Soon", cls: "bg-white/90 text-blue-600 border-white/50 backdrop-blur-sm shadow-sm" },
};

/** Safe lookup so an unknown trip status never crashes on `.label`/`.cls`. */
function statusStyle(status: string | undefined): { label: string; cls: string } {
  return (status && STATUS_STYLE[status]) || STATUS_STYLE["coming-soon"];
}

const FILTERS = ["All", "Available", "Americas", "Africa", "Asia", "Sold Out"] as const;

export default function TripsPage() {
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Trip | null>(null);
  const reduceMotion = useReducedMotion();

  const REGION_MAP: Record<string, string> = {
    Mexico: "Americas", USA: "Americas", Colombia: "Americas",
    Indonesia: "Asia", Japan: "Asia",
    Kenya: "Africa", Morocco: "Africa",
  };

  const limitedSpots = TRIPS_DATA.filter(
    (t) => t.status === "available" && t.spotsLeft <= 8,
  ).sort((a, b) => a.spotsLeft - b.spotsLeft);

  const filtered = TRIPS_DATA.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Available") return t.status === "available";
    if (filter === "Sold Out") return t.status === "sold-out" || t.status === "waitlist";
    return REGION_MAP[t.country] === filter;
  });

  return (
    <CmsPageWrapper slug="trips">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero banner — light editorial, coral accent allowed on trips */}
        <section className="canvas-editorial grain relative overflow-hidden py-28 sm:py-32">
          <div className="mesh-warm" />
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
              className="pill-glass mx-auto mb-7 flex w-fit items-center gap-2.5 px-4 py-1.5"
            >
              <Plane className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
              <span className="eyebrow text-[#B51760]">
                The World Is Better With Amigas
              </span>
            </motion.div>
            <h1 className="text-editorial font-display text-ink text-balance">
              Shop{" "}
              <span className="font-display-italic marker-swipe text-[#B51760]">Trips</span>
            </h1>
            <p className="text-lead font-[family-name:var(--font-sans)] mx-auto mt-6 max-w-xl text-ink-soft">
              Leave the hassle of planning to us. All you need to worry about is
              enjoying your trip while creating lifelong memories con tus nuevas
              Amigas.
            </p>
          </motion.div>
        </section>

        {/* Filters */}
        <section className="glass sticky top-[88px] z-10 border-b border-[#221019]/10">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]",
                  filter === f
                    ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-md shadow-[#FF0099]/25"
                    : "text-ink-soft hover:bg-[#FF0099]/5 hover:text-[#B51760]",
                )}
              >
                {f}
              </button>
            ))}
            <div className="ml-auto shrink-0 text-sm font-medium text-ink-soft">
              {filtered.length} trip{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </section>

        {/* Limited spots featured — coral accent rail on warm canvas */}
        {limitedSpots.length > 0 && (
          <section className="canvas-warm border-b border-[#FF7F50]/15 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF7F50] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF7F50]" />
                </span>
                <h3 className="eyebrow text-[#FF7F50]">
                  Limited Spots Left
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
                {limitedSpots.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => setSelected(trip)}
                    aria-label={`View ${trip.title} — only ${trip.spotsLeft} spot${trip.spotsLeft !== 1 ? "s" : ""} left`}
                    className="lift group shrink-0 w-64 snap-center flex items-center gap-4 rounded-2xl border border-[#FF7F50]/20 bg-white p-4 elevate-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                  >
                    <div className={`grain relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${trip.gradient} text-2xl`} aria-hidden="true">
                      {trip.emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate font-display text-ink group-hover:text-[#B51760] transition-colors">{trip.title}</p>
                      <p className="text-[10px] text-ink-soft">{trip.dates}</p>
                      <p className="text-xs font-bold text-[#FF7F50] mt-0.5">
                        Only {trip.spotsLeft} spot{trip.spotsLeft !== 1 ? "s" : ""} left!
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Trip grid — Airbnb photo-card anatomy on cream */}
        <section className="canvas-editorial relative py-14">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((trip, i) => {
                  const st = statusStyle(trip.status);
                  return (
                    <motion.div
                      key={trip.id}
                      layout
                      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                      transition={{ delay: reduceMotion ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <button
                        onClick={() => setSelected(trip)}
                        aria-label={`View ${trip.title} trip details — ${trip.dates}, $${trip.price.toLocaleString()} per person`}
                        className="photo-card group block w-full text-left elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                      >
                        <div className="photo-card-media p-2.5">
                          <div className={`photo-card-zoom grain relative flex h-44 items-center justify-center rounded-[1.1rem] bg-gradient-to-br ${trip.gradient}`}>
                            <span className="relative text-5xl drop-shadow-lg" aria-hidden="true">
                              {trip.emoji}
                            </span>
                            <span className="glass-control absolute top-3 right-3 h-9 w-9" aria-hidden="true">
                              <span className="text-base leading-none text-white">♡</span>
                            </span>
                            <Badge className={`absolute top-3 left-3 text-[10px] font-bold ${st.cls}`}>
                              {st.label}
                            </Badge>
                            {trip.status === "available" && trip.spotsLeft <= 5 && (
                              <Badge className="absolute bottom-3 left-3 bg-[#FF7F50] text-white border-0 text-[10px] font-bold">
                                Only {trip.spotsLeft} left!
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="px-4 pb-5 pt-2">
                          <h3 className="text-lg font-display text-ink group-hover:text-[#B51760] transition-colors">
                            {trip.title}
                          </h3>
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
                            <MapPin className="h-3.5 w-3.5 text-[#FF7F50]" aria-hidden="true" />
                            {trip.destination}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-[#FF7F50]" aria-hidden="true" />
                              {trip.dates}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-[#FF7F50]" aria-hidden="true" />
                              {trip.duration}
                            </span>
                          </div>
                          <div className="mt-3 flex items-end justify-between">
                            <div>
                              <span className="text-xl font-bold text-[#FF0099]">
                                ${trip.price.toLocaleString()}
                              </span>
                              <span className="text-xs text-ink-soft ml-1">
                                /person
                              </span>
                            </div>
                            {trip.status === "available" && (
                              <span className="text-[10px] text-ink-soft">
                                from ${trip.deposit} deposit
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </motion.div>
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
                  <Plane className="h-7 w-7 text-[#B51760]/50" aria-hidden="true" />
                </div>
                <p className="text-lg font-display text-ink">
                  No trips match &ldquo;{filter}&rdquo; right now
                </p>
                <p className="text-sm text-ink-soft mt-1">
                  New destinations drop all the time — try another filter ♡
                </p>
                <button
                  onClick={() => setFilter("All")}
                  className="mt-5 rounded-full border border-[#221019]/15 px-5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-[#FF0099]/5 hover:text-[#B51760] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                >
                  Show all trips
                </button>
              </motion.div>
            )}
          </div>
        </section>

        {/* How to Book — editorial cards on warm canvas */}
        <section className="canvas-warm grain relative overflow-hidden border-t border-[#FF7F50]/15 py-24">
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="eyebrow text-[#FF7F50] mb-3">Four Simple Steps</p>
              <h2 className="text-title font-display text-ink">
                How to{" "}
                <span className="font-display-italic marker-swipe text-[#B51760]">Book</span>
              </h2>
              <p className="mt-3 text-ink-soft text-lead max-w-lg mx-auto">
                Four simple steps stand between you and the trip of a lifetime.
              </p>
            </motion.div>
            <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: "1", icon: CreditCard, title: "Secure Your Spot", desc: "Pay in full or place a deposit with a payment plan." },
                { step: "2", icon: Check, title: "Sign Agreement", desc: "Review and sign the travel agreement & waiver via email." },
                { step: "3", icon: Users, title: "Meet Your Amigas", desc: "Join a mandatory group Zoom call to meet your travel crew." },
                { step: "4", icon: Sparkles, title: "Pack & Go!", desc: "We meet you at the airport. Just bring yourself and good vibes!" },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="lift flex flex-col items-center text-center bg-white rounded-2xl p-6 elevate-2 border border-[#221019]/8"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7F50]/20 to-[#FF0099]/10 text-[#FF7F50] mb-4 ring-gradient">
                    <s.icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <div className="text-xs font-bold text-[#FF7F50]/80 uppercase tracking-wider mb-1.5">
                    Step {s.step}
                  </div>
                  <h3 className="font-display text-ink text-lg">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Trip detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-strong border-rosa/30 elevate-4">
          {selected && <TripDetail trip={selected} />}
        </DialogContent>
      </Dialog>
    </CmsPageWrapper>
  );
}

function TripDetail({ trip }: { trip: Trip }) {
  const st = statusStyle(trip.status);
  return (
    <>
      <div className={`grain -mx-6 -mt-6 h-52 bg-gradient-to-br ${trip.gradient} flex items-center justify-center relative rounded-t-lg`}>
        <span className="relative text-7xl drop-shadow-lg" aria-hidden="true">{trip.emoji}</span>
      </div>
      <DialogHeader className="mt-4">
        <div className="flex items-center gap-3">
          <DialogTitle className="text-2xl font-display text-ink">
            {trip.title}
          </DialogTitle>
          <Badge className={st.cls}>{st.label}</Badge>
        </div>
        <DialogDescription className="sr-only">
          {trip.destination}, {trip.country} — {trip.dates}. {trip.description}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Calendar, label: trip.dates },
          { icon: Clock, label: trip.duration },
          { icon: MapPin, label: trip.destination },
          { icon: Users, label: `${trip.spots} amigas max` },
        ].map((d) => (
          <div key={d.label} className="flex items-center gap-2 rounded-xl glass p-2.5 text-xs text-ink-soft">
            <d.icon className="h-3.5 w-3.5 text-[#FF7F50] shrink-0" aria-hidden="true" />
            {d.label}
          </div>
        ))}
      </div>

      <p className="mt-4 text-ink-soft leading-relaxed">{trip.description}</p>

      <Separator className="my-4 border-rosa/20" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="font-display text-ink text-sm mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[#FF0099]" /> Highlights
          </h4>
          <ul className="space-y-1.5">
            {trip.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 text-sm text-ink-soft">
                <ArrowRight className="h-3 w-3 mt-1 text-[#FF0099] shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display text-ink text-sm mb-2 flex items-center gap-1.5">
            <Check className="h-4 w-4 text-green-600" /> Included
          </h4>
          <ul className="space-y-1.5">
            {trip.includes.map((inc) => (
              <li key={inc} className="flex items-start gap-2 text-sm text-ink-soft">
                <Check className="h-3 w-3 mt-1 text-green-600 shrink-0" />
                {inc}
              </li>
            ))}
          </ul>
          <h4 className="font-display text-ink text-sm mt-4 mb-2 flex items-center gap-1.5">
            <X className="h-4 w-4 text-red-400" /> Not Included
          </h4>
          <ul className="space-y-1.5">
            {trip.notIncluded.map((ni) => (
              <li key={ni} className="flex items-start gap-2 text-sm text-ink-soft">
                <X className="h-3 w-3 mt-1 text-red-400 shrink-0" />
                {ni}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Separator className="my-4 border-rosa/20" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-3xl font-bold text-[#FF0099]">${trip.price.toLocaleString()}</span>
          <span className="text-ink-soft ml-1">/person</span>
          {trip.status === "available" && (
            <p className="text-xs text-ink-soft mt-0.5">
              Payment plans available — from ${trip.deposit} deposit
            </p>
          )}
        </div>
        {trip.status === "coming-soon" ? (
          <Badge className={`${st.cls} text-sm px-4 py-1.5`}>{st.label}</Badge>
        ) : (
          <ReserveButton trip={trip} variant="full" className="sm:text-right" />
        )}
      </div>
    </>
  );
}
