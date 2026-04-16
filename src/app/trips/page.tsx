"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRIPS_DATA, type Trip } from "@/lib/trips-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
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
} from "lucide-react";
import Link from "next/link";

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  available: { label: "Book Now", cls: "bg-green-500/15 text-green-700 border-green-500/20 dark:text-green-300" },
  "sold-out": { label: "Sold Out", cls: "bg-red-500/15 text-red-600 border-red-500/20" },
  waitlist: { label: "Join Waitlist", cls: "bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-300" },
  "coming-soon": { label: "Coming Soon", cls: "bg-blue-500/15 text-blue-600 border-blue-500/20" },
};

const FILTERS = ["All", "Available", "Americas", "Africa", "Asia", "Sold Out"] as const;

export default function TripsPage() {
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Trip | null>(null);

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
    <>
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero banner */}
        <section className="relative overflow-hidden bg-[#1a0a12] py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1f0d16] to-[#0d060a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,oklch(0.40_0.14_340/0.15),transparent)]" />
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#FFB3D0]">
              Come as Strangers, Leave as Amigas
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-heading)] text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              Shop{" "}
              <span className="bg-gradient-to-r from-[#FFB3D0] via-[#E8458B] to-[#D4A56A] bg-clip-text text-transparent">
                Trips
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-white/50">
              Leave the hassle of planning to us. All you need to worry about is
              enjoying your trip while creating lifelong memories con tus nuevas
              Amigas.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b border-rosa/15 bg-background">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
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
            <div className="ml-auto text-sm text-muted-foreground">
              {filtered.length} trip{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </section>

        {/* Limited spots featured */}
        {limitedSpots.length > 0 && (
          <section className="border-b border-rosa/15 bg-gradient-to-r from-rosa/5 via-background to-rosa/5 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 mb-5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-600">
                  Limited Spots Left
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
                {limitedSpots.map((trip) => {
                  const st = STATUS_STYLE[trip.status];
                  return (
                    <button
                      key={trip.id}
                      onClick={() => setSelected(trip)}
                      className="group shrink-0 w-64 snap-center flex items-center gap-4 rounded-xl border border-red-500/15 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 text-left"
                    >
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${trip.gradient} text-2xl`}>
                        {trip.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate font-[family-name:var(--font-heading)]">{trip.title}</p>
                        <p className="text-[10px] text-muted-foreground">{trip.dates}</p>
                        <p className="text-xs font-bold text-red-600 mt-0.5">
                          Only {trip.spotsLeft} spot{trip.spotsLeft !== 1 ? "s" : ""} left!
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Trip grid */}
        <section className="relative py-12">
          <div className="absolute inset-0 pattern-grid opacity-15" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((trip, i) => {
                  const st = STATUS_STYLE[trip.status];
                  return (
                    <motion.div
                      key={trip.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <button
                        onClick={() => setSelected(trip)}
                        className="group w-full text-left rounded-2xl border border-rosa/15 bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                      >
                        <div className={`relative h-40 bg-gradient-to-br ${trip.gradient} flex items-center justify-center`}>
                          <div className="absolute inset-0 pattern-dots opacity-10" />
                          <span className="relative text-5xl drop-shadow-lg transition-transform group-hover:scale-110">
                            {trip.emoji}
                          </span>
                          <Badge className={`absolute top-3 right-3 text-[10px] font-bold ${st.cls}`}>
                            {st.label}
                          </Badge>
                          {trip.status === "available" && trip.spotsLeft <= 5 && (
                            <Badge className="absolute top-3 left-3 bg-red-500 text-white border-0 text-[10px] font-bold">
                              Only {trip.spotsLeft} left!
                            </Badge>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-bold font-[family-name:var(--font-heading)]">
                            {trip.title}
                          </h3>
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {trip.dates}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {trip.duration}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div>
                              <span className="text-xl font-bold text-primary">
                                ${trip.price.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">
                                /person
                              </span>
                            </div>
                            {trip.status === "available" && (
                              <span className="text-[10px] text-muted-foreground">
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
          </div>
        </section>

        {/* How to Book */}
        <section className="border-t border-rosa/15 bg-gradient-to-b from-rosa/5 to-background py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold sm:text-4xl">
              How to{" "}
              <span className="bg-gradient-to-r from-primary to-magenta bg-clip-text text-transparent">
                Book
              </span>
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: "1", icon: CreditCard, title: "Secure Your Spot", desc: "Pay in full or place a deposit with a payment plan." },
                { step: "2", icon: Check, title: "Sign Agreement", desc: "Review and sign the travel agreement & waiver via email." },
                { step: "3", icon: Users, title: "Meet Your Amigas", desc: "Join a mandatory group Zoom call to meet your travel crew." },
                { step: "4", icon: Sparkles, title: "Pack & Go!", desc: "We meet you at the airport. Just bring yourself and good vibes!" },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-rosa/10 text-primary mb-4">
                    <s.icon className="h-7 w-7" />
                  </div>
                  <div className="text-xs font-bold text-primary/60 uppercase tracking-wider mb-1">
                    Step {s.step}
                  </div>
                  <h3 className="font-semibold font-[family-name:var(--font-heading)]">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Trip detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && <TripDetail trip={selected} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TripDetail({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const st = STATUS_STYLE[trip.status];
  return (
    <>
      <div className={`-mx-6 -mt-6 h-48 bg-gradient-to-br ${trip.gradient} flex items-center justify-center relative rounded-t-lg`}>
        <div className="absolute inset-0 pattern-dots opacity-10 rounded-t-lg" />
        <span className="relative text-7xl drop-shadow-lg">{trip.emoji}</span>
      </div>
      <DialogHeader className="mt-4">
        <div className="flex items-center gap-3">
          <DialogTitle className="text-2xl font-[family-name:var(--font-heading)]">
            {trip.title}
          </DialogTitle>
          <Badge className={st.cls}>{st.label}</Badge>
        </div>
      </DialogHeader>

      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Calendar, label: trip.dates },
          { icon: Clock, label: trip.duration },
          { icon: MapPin, label: trip.destination },
          { icon: Users, label: `${trip.spots} amigas max` },
        ].map((d) => (
          <div key={d.label} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-xs">
            <d.icon className="h-3.5 w-3.5 text-primary shrink-0" />
            {d.label}
          </div>
        ))}
      </div>

      <p className="mt-4 text-muted-foreground leading-relaxed">{trip.description}</p>

      <Separator className="my-4" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> Highlights
          </h4>
          <ul className="space-y-1.5">
            {trip.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ArrowRight className="h-3 w-3 mt-1 text-primary shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
            <Check className="h-4 w-4 text-green-500" /> Included
          </h4>
          <ul className="space-y-1.5">
            {trip.includes.map((inc) => (
              <li key={inc} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-3 w-3 mt-1 text-green-500 shrink-0" />
                {inc}
              </li>
            ))}
          </ul>
          <h4 className="font-semibold text-sm mt-4 mb-2 flex items-center gap-1.5">
            <X className="h-4 w-4 text-red-400" /> Not Included
          </h4>
          <ul className="space-y-1.5">
            {trip.notIncluded.map((ni) => (
              <li key={ni} className="flex items-start gap-2 text-sm text-muted-foreground">
                <X className="h-3 w-3 mt-1 text-red-400 shrink-0" />
                {ni}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-3xl font-bold text-primary">${trip.price.toLocaleString()}</span>
          <span className="text-muted-foreground ml-1">/person</span>
          {trip.status === "available" && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Payment plans available — from ${trip.deposit} deposit
            </p>
          )}
        </div>
        {trip.status === "available" ? (
          <Button className="bg-gradient-to-r from-primary to-magenta text-white border-0 hover:opacity-90 px-8 font-semibold glow-pink">
            Book This Trip ♡
          </Button>
        ) : trip.status === "waitlist" ? (
          <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/5 px-8 font-semibold">
            Join Waitlist
          </Button>
        ) : (
          <Badge className={`${st.cls} text-sm px-4 py-1.5`}>{st.label}</Badge>
        )}
      </div>
    </>
  );
}
