"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEvents, type CalendarEvent } from "@/lib/use-events";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Clock, Sparkles } from "lucide-react";
import { format, parseISO, isPast, isValid } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { EventRsvp } from "@/components/community/event-rsvp";

/** Event types that take RSVPs on the public page (not trips/synced feeds). */
const RSVP_TYPES = new Set(["social", "meetup", "camp"]);

const TYPE_STYLE: Record<string, { cls: string; emoji: string }> = {
  trip: { cls: "bg-magenta/15 text-magenta border-magenta/20", emoji: "✈️" },
  meetup: { cls: "bg-coral/15 text-coral border-coral/20", emoji: "☕" },
  camp: { cls: "bg-plum/15 text-plum border-plum/20", emoji: "🏕️" },
  social: { cls: "bg-brand-pink/15 text-brand-pink border-brand-pink/20", emoji: "🎉" },
  synced: { cls: "bg-brand-pink/15 text-brand-pink border-brand-pink/20", emoji: "📅" },
};

/** Safe lookup so an unknown/new event type never crashes on property access. */
function typeStyle(type: string | undefined): { cls: string; emoji: string } {
  return (type && TYPE_STYLE[type]) || TYPE_STYLE.social;
}

/** Parse an ISO date safely; returns null for empty/invalid strings. */
function safeDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

const GRADIENTS = [
  "from-[#FF0099] to-[#B51760]",
  "from-[#9B2C8A] to-[#FF0099]",
  "from-[#C44B3F] to-[#9B2C8A]",
  "from-[#B51760] to-[#9B2C8A]",
  "from-[#FF0099] to-[#C44B3F]",
  "from-[#6A1B4D] to-[#FF0099]",
];

const FILTERS = ["All", "Social", "Meetup", "Trip", "Camp"] as const;

export default function EventsPage() {
  const { events, loading } = useEvents();
  const [filter, setFilter] = useState<string>("All");
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const reduceMotion = useReducedMotion();

  const upcoming = events
    .filter((e) => {
      const d = safeDate(e.date);
      return d !== null && !isPast(d);
    })
    .filter((e) => filter === "All" || (e.type ?? "").toLowerCase() === filter.toLowerCase())
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <CmsPageWrapper slug="events">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero — light editorial */}
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
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF0099] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF0099]" />
              </span>
              <span className="eyebrow text-[#B51760]">
                Always Something Happening
              </span>
            </motion.div>
            <h1 className="text-editorial font-display text-ink text-balance">
              Upcoming{" "}
              <span className="font-display-italic marker-swipe text-[#B51760]">Events</span>
            </h1>
            <p className="text-lead font-[family-name:var(--font-sans)] mx-auto mt-6 max-w-xl text-ink-soft">
              Coffee meetups, camp weekends, group trips, and social
              celebrations. There&apos;s always something happening with AYMS.
            </p>
          </motion.div>
        </section>

        {/* Filters */}
        <section className="glass sticky top-[88px] z-10 border-b border-[#221019]/10">
          <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
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
          </div>
        </section>

        {/* Events timeline */}
        <section className="canvas-editorial relative py-14">
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-4" aria-busy="true" aria-live="polite">
                <span className="sr-only">Loading events…</span>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex w-full items-stretch overflow-hidden rounded-2xl border border-[#221019]/8 bg-white elevate-2"
                  >
                    <div className="h-[88px] w-24 shrink-0 animate-pulse bg-rosa/10" />
                    <div className="flex-1 space-y-2.5 px-5 py-5">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-rosa/10" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-rosa/10" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-rosa/10" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state — only once loading has settled */}
            {!loading && upcoming.length === 0 && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass elevate-2">
                  <Calendar className="h-7 w-7 text-[#B51760]/50" />
                </div>
                <p className="text-lg font-display text-ink">
                  {filter === "All"
                    ? "Nothing on the calendar yet"
                    : `No ${filter.toLowerCase()} events coming up`}
                </p>
                <p className="text-sm text-ink-soft mt-1">
                  {filter === "All"
                    ? "Check back soon, amiga — new adventures drop often ♡"
                    : "Try a different filter, or check back soon ♡"}
                </p>
                {filter !== "All" && (
                  <button
                    onClick={() => setFilter("All")}
                    className="mt-5 rounded-full border border-[#221019]/15 px-5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-[#FF0099]/5 hover:text-[#B51760] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                  >
                    Show all events
                  </button>
                )}
              </motion.div>
            )}

            {!loading && upcoming.length > 0 && (
              <AnimatePresence mode="popLayout">
                {upcoming.map((ev, i) => {
                  const ts = typeStyle(ev.type);
                  const grad = GRADIENTS[i % GRADIENTS.length];
                  const d = safeDate(ev.date);
                  const endD = safeDate(ev.endDate);
                  return (
                    <motion.div
                      key={ev.id}
                      layout
                      initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                      transition={{ delay: reduceMotion ? 0 : i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      className="mb-4"
                    >
                      <button
                        onClick={() => setDetail(ev)}
                        aria-label={`View details for ${ev.title}${d ? `, ${format(d, "MMMM d, yyyy")}` : ""}`}
                        className="lift group flex w-full items-stretch gap-0 rounded-2xl border border-[#221019]/8 bg-white overflow-hidden text-left elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                      >
                        {/* Date block — photo (when available) behind the date stamp, else gradient */}
                        <div className={`grain relative flex w-24 shrink-0 flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${grad} text-white p-4`}>
                          {ev.image && (
                            <>
                              <Image src={ev.image} alt="" fill unoptimized sizes="96px" className="object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/35 to-black/50" aria-hidden="true" />
                            </>
                          )}
                          <div className="relative z-10 flex flex-col items-center">
                            {d ? (
                              <>
                                <span className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-80">
                                  {format(d, "MMM")}
                                </span>
                                <span className="text-3xl font-extrabold leading-tight font-[family-name:var(--font-heading)]">
                                  {format(d, "d")}
                                </span>
                                <span className="text-[10px] opacity-70 mt-0.5">
                                  {format(d, "EEE")}
                                </span>
                              </>
                            ) : (
                              <Calendar className="h-6 w-6 opacity-80" aria-hidden="true" />
                            )}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 py-4 px-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-display text-ink text-lg group-hover:text-[#B51760] transition-colors">
                                <span aria-hidden="true">{ts.emoji} </span>{ev.title}
                              </h3>
                              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                                {ev.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-[#FF0099]/70" aria-hidden="true" />
                                    {ev.location}
                                  </span>
                                )}
                                {d && endD && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-[#FF0099]/70" aria-hidden="true" />
                                    {format(d, "MMM d")} — {format(endD, "MMM d")}
                                  </span>
                                )}
                              </div>
                            </div>
                            {ev.type && ev.type !== "synced" && (
                              <Badge className={`shrink-0 ${ts.cls} text-[10px] font-bold capitalize`}>
                                {ev.type}
                              </Badge>
                            )}
                          </div>
                          {ev.description && (
                            <p className="mt-2 text-sm text-ink-soft line-clamp-1">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="canvas-warm grain relative overflow-hidden border-t border-[#221019]/8 py-20">
          <div className="mesh-warm opacity-70" />
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8"
          >
            <h2 className="text-title font-display text-ink">
              Want to see the{" "}
              <span className="font-display-italic marker-swipe text-[#B51760]">full calendar?</span>
            </h2>
            <p className="mt-3 text-ink-soft text-lead">
              Join the community portal for the interactive calendar, RSVP
              tracking, and event chat channels.
            </p>
            <Link
              href="/community/calendar"
              className={cn(
                buttonVariants({ size: "lg" }),
                "lift mt-8 h-14 rounded-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-10 text-base font-semibold tracking-wide text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110"
              )}
            >
              Open Community Calendar ♡
            </Link>
          </motion.div>
        </section>
      </main>
      <Footer />

      {/* Event detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="glass-strong border-rosa/30 elevate-4">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-ink">
                  <span aria-hidden="true">{typeStyle(detail.type).emoji} </span>{detail.title}
                </DialogTitle>
                {detail.description && (
                  <DialogDescription className="leading-relaxed">
                    {detail.description}
                  </DialogDescription>
                )}
              </DialogHeader>
              {detail.type && detail.type !== "synced" && (
                <Badge className={`w-fit capitalize ${typeStyle(detail.type).cls}`}>
                  {detail.type}
                </Badge>
              )}
              <Separator className="border-rosa/20" />
              <div className="space-y-2 text-sm text-ink-soft">
                {safeDate(detail.date) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#FF0099]" aria-hidden="true" />
                    {format(safeDate(detail.date)!, "MMMM d, yyyy")}
                    {safeDate(detail.endDate) &&
                      ` — ${format(safeDate(detail.endDate)!, "MMMM d, yyyy")}`}
                  </div>
                )}
                {detail.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#FF0099]" aria-hidden="true" />
                    {detail.location}
                  </div>
                )}
              </div>
              {RSVP_TYPES.has(detail.type ?? "") && (
                <>
                  <Separator className="border-rosa/20" />
                  <EventRsvp
                    targetType="event"
                    targetId={detail.id}
                    title={detail.title}
                    date={detail.date}
                    startTime={detail.startTime}
                    location={detail.location}
                    capacity={detail.capacity}
                  />
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </CmsPageWrapper>
  );
}
