"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { type Trip } from "@/lib/trips-data";
import { useTrips } from "@/lib/use-trips";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReserveButton } from "@/components/trips/reserve-button";
import { EditableText } from "@/components/inline/editable-text";
import { ensureHttp } from "@/lib/url";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Plane,
} from "lucide-react";
import Image from "next/image";

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

/**
 * Trips body — the filter rail, the "limited spots" feature strip, the live
 * trip grid and the trip-detail dialog. These all share the `filter`/`selected`
 * state and the live `useTrips()` list, so they live together in one section.
 */
export function TripsGrid() {
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Trip | null>(null);
  const reduceMotion = useReducedMotion();
  const { trips, loading } = useTrips();

  const REGION_MAP: Record<string, string> = {
    Mexico: "Americas", USA: "Americas", Colombia: "Americas",
    Indonesia: "Asia", Japan: "Asia",
    Kenya: "Africa", Morocco: "Africa",
  };

  // Live, admin-published list — drafts (published === false) are admin-only.
  const publicTrips = useMemo(
    () => trips.filter((t) => t.published !== false),
    [trips],
  );

  const limitedSpots = publicTrips
    .filter((t) => t.status === "available" && t.spotsLeft <= 8)
    .sort((a, b) => a.spotsLeft - b.spotsLeft);

  const filtered = publicTrips.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Available") return t.status === "available";
    if (filter === "Sold Out") return t.status === "sold-out" || t.status === "waitlist";
    return REGION_MAP[t.country] === filter;
  });

  return (
    <>
      {/* Filters */}
      <section className="glass sticky top-[88px] z-10 border-b border-[#221019]/10">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {FILTERS.map((f, i) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]",
                filter === f
                  ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-md shadow-[#FF0099]/25"
                  : "text-ink-soft hover:bg-[#FF0099]/5 hover:text-[#B51760]",
              )}
            >
              <EditableText as="span" id={`trips.filter.${i}`}>{f}</EditableText>
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
              <EditableText as="h3" id="trips.limited.title" className="eyebrow text-[#FF7F50]">
                Limited Spots Left
              </EditableText>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
              {limitedSpots.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => setSelected(trip)}
                  aria-label={`View ${trip.title} — only ${trip.spotsLeft} spot${trip.spotsLeft !== 1 ? "s" : ""} left`}
                  className="lift group shrink-0 w-64 snap-center flex items-center gap-4 rounded-2xl border border-[#FF7F50]/20 bg-white p-4 elevate-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                >
                  <div className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${trip.gradient}`} aria-hidden="true">
                    <Image src={trip.image} alt={trip.title} fill sizes="56px" className="object-cover" />
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
          {/* Loading skeleton — only while the live list is still resolving */}
          {loading && trips.length === 0 && (
            <div
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              aria-busy="true"
              aria-live="polite"
            >
              <span className="sr-only">Loading trips…</span>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-[1.4rem] border border-[#221019]/8 bg-white elevate-2"
                >
                  <div className="m-2.5 h-44 animate-pulse rounded-[1.1rem] bg-rosa/10" />
                  <div className="space-y-2.5 px-4 pb-5 pt-2">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-rosa/10" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-rosa/10" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-rosa/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((trip, i) => {
                const st = statusStyle(trip.status);
                const booking = ensureHttp(trip.bookingUrl);
                const bookLabel = trip.bookingLabel?.trim() || "Book Now";
                return (
                  <motion.div
                    key={trip.id}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="relative flex h-full flex-col"
                  >
                    <button
                      onClick={() => setSelected(trip)}
                      aria-label={`View ${trip.title} trip details — ${trip.dates}, $${trip.price.toLocaleString()} per person`}
                      className="photo-card group block w-full flex-1 text-left elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                    >
                      <div className="photo-card-media p-2.5">
                        <div className={`photo-card-zoom grain relative h-44 overflow-hidden rounded-[1.1rem] bg-gradient-to-br ${trip.gradient}`}>
                          <Image
                            src={trip.image}
                            alt={`${trip.destination}, ${trip.country}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw"
                            className="object-cover"
                          />
                          {/* scrim so white status badge + heart stay legible over any photo */}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/15" aria-hidden="true" />
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
                          {!booking && trip.status === "available" && (
                            <span className="text-[10px] text-ink-soft">
                              from ${trip.deposit} deposit
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {booking && (
                      <a
                        href={booking}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${bookLabel} — ${trip.title}`}
                        className="absolute bottom-[1.15rem] right-4 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgb(255_0_153/0.28)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] focus-visible:ring-offset-2"
                      >
                        {bookLabel}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {!loading && filtered.length === 0 && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass elevate-2">
                <Plane className="h-7 w-7 text-[#B51760]/50" aria-hidden="true" />
              </div>
              <p className="text-lg font-display text-ink">
                <EditableText as="span" id="trips.empty.titleBefore">No trips match</EditableText>{" "}
                &ldquo;{filter}&rdquo;{" "}
                <EditableText as="span" id="trips.empty.titleAfter">right now</EditableText>
              </p>
              <EditableText as="p" id="trips.empty.subtitle" className="text-sm text-ink-soft mt-1">
                New destinations drop all the time — try another filter ♡
              </EditableText>
              <button
                onClick={() => setFilter("All")}
                className="mt-5 rounded-full border border-[#221019]/15 px-5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-[#FF0099]/5 hover:text-[#B51760] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
              >
                <EditableText as="span" id="trips.empty.reset">Show all trips</EditableText>
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Trip detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {/* `sm:max-w-2xl` (not bare `max-w-2xl`) so it beats the base
            DialogContent's `sm:max-w-sm` at ≥640px — otherwise the wide
            2-column detail content overflows a 384px popup and clips. */}
        <DialogContent className="w-[calc(100vw-2rem)] gap-0 overflow-x-hidden overflow-y-auto border-rosa/30 glass-strong elevate-4 sm:max-w-2xl max-h-[90vh]">
          {selected && <TripDetail trip={selected} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TripDetail({ trip }: { trip: Trip }) {
  const st = statusStyle(trip.status);
  return (
    <>
      <div className={`-mx-4 -mt-4 h-52 relative overflow-hidden rounded-t-xl bg-gradient-to-br ${trip.gradient}`}>
        <Image
          src={trip.image}
          alt={`${trip.destination}, ${trip.country}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 672px"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden="true" />
        <span className="absolute bottom-3 left-4 text-4xl drop-shadow-lg" aria-hidden="true">{trip.emoji}</span>
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
            <Sparkles className="h-4 w-4 text-[#FF0099]" /> <EditableText as="span" id="trips.detail.highlights">Highlights</EditableText>
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
            <Check className="h-4 w-4 text-green-600" /> <EditableText as="span" id="trips.detail.included">Included</EditableText>
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
            <X className="h-4 w-4 text-red-400" /> <EditableText as="span" id="trips.detail.notIncluded">Not Included</EditableText>
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
