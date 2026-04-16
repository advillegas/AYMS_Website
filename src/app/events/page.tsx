"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEvents, type CalendarEvent } from "@/lib/store";
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

const TYPE_STYLE: Record<string, { cls: string; emoji: string }> = {
  trip: { cls: "bg-blue-500/15 text-blue-700 border-blue-500/20", emoji: "✈️" },
  meetup: { cls: "bg-green-500/15 text-green-700 border-green-500/20", emoji: "☕" },
  camp: { cls: "bg-orange-500/15 text-orange-700 border-orange-500/20", emoji: "🏕️" },
  social: { cls: "bg-pink-500/15 text-pink-700 border-pink-500/20", emoji: "🎉" },
};

const GRADIENTS = [
  "from-[#E8458B] to-[#D4357A]",
  "from-[#DAA520] to-[#C44B3F]",
  "from-[#9B2C8A] to-[#E8458B]",
  "from-[#2D8B6F] to-[#DAA520]",
  "from-[#C44B3F] to-[#DAA520]",
  "from-[#D4357A] to-[#9B2C8A]",
];

const FILTERS = ["All", "Social", "Meetup", "Trip", "Camp"] as const;

export default function EventsPage() {
  const events = useEvents((s) => s.events);
  const [filter, setFilter] = useState<string>("All");
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

  const upcoming = events
    .filter((e) => !isPast(parseISO(e.date)))
    .filter((e) => filter === "All" || e.type.toLowerCase() === filter.toLowerCase())
    .sort((a, b) => a.date.localeCompare(b.date));

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
            <Sparkles className="mx-auto h-12 w-12 text-[#FFB3D0]/60 mb-4" />
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              Upcoming{" "}
              <span className="bg-gradient-to-r from-[#FFB3D0] via-[#E8458B] to-[#D4A56A] bg-clip-text text-transparent">
                Events
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-white/50">
              Coffee meetups, camp weekends, group trips, and social
              celebrations. There&apos;s always something happening with AYMS.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b border-rosa/15 bg-background">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  filter === f
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Events timeline */}
        <section className="relative py-12">
          <div className="absolute inset-0 pattern-grid opacity-10" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <AnimatePresence mode="popLayout">
              {upcoming.length === 0 && (
                <div className="py-20 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-lg font-medium">No upcoming events</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check back soon or adjust your filters!
                  </p>
                </div>
              )}
              {upcoming.map((ev, i) => {
                const ts = TYPE_STYLE[ev.type];
                const grad = GRADIENTS[i % GRADIENTS.length];
                const d = parseISO(ev.date);
                return (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.06 }}
                    className="mb-4"
                  >
                    <button
                      onClick={() => setDetail(ev)}
                      className="group flex w-full items-stretch gap-4 rounded-2xl border border-rosa/15 bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 text-left"
                    >
                      {/* Date block */}
                      <div className={`flex w-20 shrink-0 flex-col items-center justify-center bg-gradient-to-br ${grad} text-white p-3`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                          {format(d, "MMM")}
                        </span>
                        <span className="text-2xl font-extrabold leading-tight font-[family-name:var(--font-heading)]">
                          {format(d, "d")}
                        </span>
                        <span className="text-[10px] opacity-70">
                          {format(d, "EEE")}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 py-4 pr-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold font-[family-name:var(--font-heading)] group-hover:text-primary transition-colors">
                              {ts.emoji} {ev.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {ev.location}
                              </span>
                              {ev.endDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
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
        <section className="border-t border-rosa/15 bg-gradient-to-b from-rosa/5 to-background py-16">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
              Want to see the full calendar?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Join the community portal for the interactive calendar, RSVP
              tracking, and event chat channels.
            </p>
            <Link
              href="/community/calendar"
              className={cn(buttonVariants(), "mt-6 bg-gradient-to-r from-primary to-magenta text-white border-0 hover:opacity-90 px-8 font-semibold")}
            >
              Open Community Calendar ♡
            </Link>
          </div>
        </section>
      </main>
      <Footer />

      {/* Event detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-[family-name:var(--font-heading)]">
                  {TYPE_STYLE[detail.type].emoji} {detail.title}
                </DialogTitle>
              </DialogHeader>
              <Badge className={TYPE_STYLE[detail.type].cls}>{detail.type}</Badge>
              <p className="text-muted-foreground leading-relaxed">{detail.description}</p>
              <Separator />
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
    </>
  );
}
