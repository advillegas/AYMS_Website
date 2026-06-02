"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEvents, type CalendarEvent } from "@/lib/use-events";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Clock, Sparkles } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import Link from "next/link";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";

const TYPE_STYLE: Record<string, { cls: string; emoji: string }> = {
  trip: { cls: "bg-magenta/15 text-magenta border-magenta/20", emoji: "✈️" },
  meetup: { cls: "bg-coral/15 text-coral border-coral/20", emoji: "☕" },
  camp: { cls: "bg-plum/15 text-plum border-plum/20", emoji: "🏕️" },
  social: { cls: "bg-brand-pink/15 text-brand-pink border-brand-pink/20", emoji: "🎉" },
};

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
  const { events } = useEvents();
  const [filter, setFilter] = useState<string>("All");
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

  const upcoming = events
    .filter((e) => !isPast(parseISO(e.date)))
    .filter((e) => filter === "All" || e.type.toLowerCase() === filter.toLowerCase())
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <CmsPageWrapper slug="events">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero */}
        <section className="grain aurora relative overflow-hidden bg-[#1a0a12] py-28">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] via-[#1a0a12] to-[#1A0814]" />
          <div className="absolute inset-0 pattern-dots opacity-[0.07]" />
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-[0_0_32px_rgb(255_0_153/0.25)]"
            >
              <Sparkles className="h-8 w-8 text-[#FFB3D0]" />
            </motion.div>
            <div className="mx-auto mb-6 flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF0099] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF0099]" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#FFB3D0]">
                Always Something Happening
              </span>
            </div>
            <h1 className="text-hero font-[family-name:var(--font-heading)] font-extrabold text-white text-balance">
              Upcoming{" "}
              <span className="text-gradient-brand">Events</span>
            </h1>
            <p className="text-lead mx-auto mt-6 max-w-xl text-white/60">
              Coffee meetups, camp weekends, group trips, and social
              celebrations. There&apos;s always something happening with AYMS.
            </p>
          </motion.div>
        </section>

        {/* Filters */}
        <section className="border-b border-rosa/15 bg-background/95 backdrop-blur-sm sticky top-[88px] z-10">
          <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]",
                  filter === f
                    ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Events timeline */}
        <section className="relative py-14">
          <div className="absolute inset-0 pattern-grid opacity-[0.07]" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <AnimatePresence mode="popLayout">
              {upcoming.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-24 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass elevate-2">
                    <Calendar className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold font-[family-name:var(--font-heading)]">Nothing on the calendar yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check back soon, amiga — new adventures drop often ♡
                  </p>
                </motion.div>
              )}
              {upcoming.map((ev, i) => {
                const ts = TYPE_STYLE[ev.type];
                const grad = GRADIENTS[i % GRADIENTS.length];
                const d = parseISO(ev.date);
                return (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-4"
                  >
                    <button
                      onClick={() => setDetail(ev)}
                      className="lift group flex w-full items-stretch gap-0 rounded-2xl border border-rosa/20 glass overflow-hidden text-left elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                    >
                      {/* Date block */}
                      <div className={`flex w-24 shrink-0 flex-col items-center justify-center bg-gradient-to-br ${grad} text-white p-4`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-80">
                          {format(d, "MMM")}
                        </span>
                        <span className="text-3xl font-extrabold leading-tight font-[family-name:var(--font-heading)]">
                          {format(d, "d")}
                        </span>
                        <span className="text-[10px] opacity-70 mt-0.5">
                          {format(d, "EEE")}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 py-4 px-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold font-[family-name:var(--font-heading)] text-base group-hover:text-primary transition-colors">
                              {ts.emoji} {ev.title}
                            </h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-primary/60" />
                                {ev.location}
                              </span>
                              {ev.endDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-primary/60" />
                                  {format(d, "MMM d")} — {format(parseISO(ev.endDate), "MMM d")}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge className={`shrink-0 ${ts.cls} text-[10px] font-bold`}>
                            {ev.type}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                          {ev.description}
                        </p>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-t border-rosa/15 py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-rosa/8 via-background to-background" />
          <div className="absolute inset-0 pattern-dots opacity-[0.05]" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8"
          >
            <h2 className="text-title font-[family-name:var(--font-heading)] font-bold">
              Want to see the{" "}
              <span className="text-gradient-brand">full calendar?</span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lead">
              Join the community portal for the interactive calendar, RSVP
              tracking, and event chat channels.
            </p>
            <Link
              href="/community/calendar"
              className={cn(
                buttonVariants({ size: "lg" }),
                "lift mt-8 h-14 rounded-full border-0 bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] px-10 text-base font-semibold tracking-wide text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110"
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
                <DialogTitle className="text-xl font-[family-name:var(--font-heading)]">
                  {TYPE_STYLE[detail.type].emoji} {detail.title}
                </DialogTitle>
              </DialogHeader>
              <Badge className={TYPE_STYLE[detail.type].cls}>{detail.type}</Badge>
              <p className="text-muted-foreground leading-relaxed">{detail.description}</p>
              <Separator className="border-rosa/20" />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {format(parseISO(detail.date), "MMMM d, yyyy")}
                  {detail.endDate && ` — ${format(parseISO(detail.endDate), "MMMM d, yyyy")}`}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {detail.location}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </CmsPageWrapper>
  );
}
