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
  Plane,
} from "lucide-react";
import Link from "next/link";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";

function tripInquiry(trip: Trip, kind: "booking" | "waitlist") {
  const subject =
    kind === "booking"
      ? `Booking inquiry: ${trip.title}`
      : `Waitlist request: ${trip.title}`;
  const intro =
    kind === "booking"
      ? "I'd like to book this trip:"
      : "Please add me to the waitlist for this trip:";
  const body = `Hi AYMS team,\n\n${intro}\n\nTrip: ${trip.title} (${trip.destination}, ${trip.country})\nDates: ${trip.dates}\nPrice: $${trip.price.toLocaleString()}/person\n\nName:\nEmail:\nPhone:\n\nThank you!`;
  window.location.href = `mailto:hello@amigasymassocial.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  available: { label: "Book Now", cls: "bg-white/90 text-green-700 border-white/50 backdrop-blur-sm shadow-sm" },
  "sold-out": { label: "Sold Out", cls: "bg-white/90 text-red-600 border-white/50 backdrop-blur-sm shadow-sm" },
  waitlist: { label: "Join Waitlist", cls: "bg-white/90 text-amber-700 border-white/50 backdrop-blur-sm shadow-sm" },
  "coming-soon": { label: "Coming Soon", cls: "bg-white/90 text-blue-600 border-white/50 backdrop-blur-sm shadow-sm" },
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
    <CmsPageWrapper slug="trips">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero banner — coral accent allowed on trips */}
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
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-[0_0_32px_rgb(255_127_80/0.30)]"
            >
              <Plane className="h-8 w-8 text-[#FF7F50]" />
            </motion.div>
            <div className="mx-auto mb-6 flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 backdrop-blur-md">
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#FFB3D0]">
                Come as Strangers, Leave as Amigas
              </span>
            </div>
            <h1 className="text-hero font-[family-name:var(--font-heading)] font-extrabold text-white text-balance">
              Shop{" "}
              <span className="text-gradient-brand">Trips</span>
            </h1>
            <p className="text-lead mx-auto mt-6 max-w-xl text-white/60">
              Leave the hassle of planning to us. All you need to worry about is
              enjoying your trip while creating lifelong memories con tus nuevas
              Amigas.
            </p>
          </motion.div>
        </section>

        {/* Filters */}
        <section className="border-b border-rosa/15 bg-background/95 backdrop-blur-sm sticky top-[88px] z-10">
          <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
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
            <div className="ml-auto shrink-0 text-sm text-muted-foreground">
              {filtered.length} trip{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </section>

        {/* Limited spots featured — coral accent banner */}
        {limitedSpots.length > 0 && (
          <section className="border-b border-[#FF7F50]/20 bg-gradient-to-r from-[#FF7F50]/5 via-background to-[#FF7F50]/5 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF7F50] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF7F50]" />
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#FF7F50]">
                  Limited Spots Left
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
                {limitedSpots.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => setSelected(trip)}
                    className="lift group shrink-0 w-64 snap-center flex items-center gap-4 rounded-xl border border-[#FF7F50]/20 glass p-4 elevate-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                  >
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${trip.gradient} text-2xl`}>
                      {trip.emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate font-[family-name:var(--font-heading)] group-hover:text-primary transition-colors">{trip.title}</p>
                      <p className="text-[10px] text-muted-foreground">{trip.dates}</p>
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

        {/* Trip grid */}
        <section className="relative py-14">
          <div className="absolute inset-0 pattern-grid opacity-[0.07]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((trip, i) => {
                  const st = STATUS_STYLE[trip.status];
                  return (
                    <motion.div
                      key={trip.id}
                      layout
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <button
                        onClick={() => setSelected(trip)}
                        className="lift group w-full text-left rounded-2xl glass border border-rosa/20 overflow-hidden elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                      >
                        <div className={`relative h-44 bg-gradient-to-br ${trip.gradient} flex items-center justify-center`}>
                          <div className="absolute inset-0 pattern-dots opacity-[0.12]" />
                          <span className="relative text-5xl drop-shadow-lg transition-transform group-hover:scale-110">
                            {trip.emoji}
                          </span>
                          <Badge className={`absolute top-3 right-3 text-[10px] font-bold ${st.cls}`}>
                            {st.label}
                          </Badge>
                          {trip.status === "available" && trip.spotsLeft <= 5 && (
                            <Badge className="absolute top-3 left-3 bg-[#FF7F50] text-white border-0 text-[10px] font-bold">
                              Only {trip.spotsLeft} left!
                            </Badge>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="text-base font-bold font-[family-name:var(--font-heading)] group-hover:text-primary transition-colors">
                            {trip.title}
                          </h3>
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 text-primary/60" />
                            {trip.dates}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 text-primary/60" />
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
        <section className="relative overflow-hidden border-t border-rosa/15 py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF7F50]/5 via-background to-background" />
          <div className="absolute inset-0 pattern-dots opacity-[0.05]" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-title font-[family-name:var(--font-heading)] font-bold">
                How to{" "}
                <span className="text-gradient-brand">Book</span>
              </h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="lift flex flex-col items-center text-center glass rounded-2xl p-6 elevate-2"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7F50]/20 to-[#FF0099]/10 text-[#FF7F50] mb-4 ring-gradient">
                    <s.icon className="h-7 w-7" />
                  </div>
                  <div className="text-xs font-bold text-[#FF7F50]/70 uppercase tracking-wider mb-1.5">
                    Step {s.step}
                  </div>
                  <h3 className="font-semibold font-[family-name:var(--font-heading)]">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
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
          {selected && <TripDetail trip={selected} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </CmsPageWrapper>
  );
}

function TripDetail({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const st = STATUS_STYLE[trip.status];
  return (
    <>
      <div className={`-mx-6 -mt-6 h-52 bg-gradient-to-br ${trip.gradient} flex items-center justify-center relative rounded-t-lg`}>
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
          <div key={d.label} className="flex items-center gap-2 rounded-xl glass p-2.5 text-xs">
            <d.icon className="h-3.5 w-3.5 text-primary shrink-0" />
            {d.label}
          </div>
        ))}
      </div>

      <p className="mt-4 text-muted-foreground leading-relaxed">{trip.description}</p>

      <Separator className="my-4 border-rosa/20" />

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

      <Separator className="my-4 border-rosa/20" />

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
          <Button
            onClick={() => tripInquiry(trip, "booking")}
            className="lift h-12 rounded-full border-0 bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] px-8 font-semibold text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110"
          >
            Book This Trip ♡
          </Button>
        ) : trip.status === "waitlist" ? (
          <Button
            onClick={() => tripInquiry(trip, "waitlist")}
            variant="outline"
            className="h-12 rounded-full border-primary/30 text-primary hover:bg-primary/5 px-8 font-semibold"
          >
            Join Waitlist
          </Button>
        ) : (
          <Badge className={`${st.cls} text-sm px-4 py-1.5`}>{st.label}</Badge>
        )}
      </div>
    </>
  );
}
