"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTrips, sortTrips, type Trip } from "@/lib/use-trips";
import { resolveBooking } from "@/lib/url";
import { EditableText } from "@/components/inline/editable-text";

/** Short scarcity/status line for a card, or null when nothing urgent. */
function urgency(t: Trip): string | null {
  if (t.status === "sold-out") return "Sold out";
  if (t.status === "waitlist") return "Waitlist open";
  if (t.status === "coming-soon") return "Coming soon";
  if (t.status === "available" && t.spotsLeft > 0 && t.spotsLeft <= 6)
    return `Only ${t.spotsLeft} spot${t.spotsLeft === 1 ? "" : "s"} left`;
  return null;
}

export function Trips() {
  const prefersReducedMotion = useReducedMotion();
  const { trips, loading } = useTrips();

  // Live, admin-published trips only — these mirror the CRM, so there are
  // no hardcoded/standalone entries here. Admin `order` curates which three
  // surface on the homepage.
  const homeTrips = useMemo(
    () => sortTrips(trips.filter((t) => t.published !== false)).slice(0, 3),
    [trips],
  );

  const showSkeleton = loading && trips.length === 0;

  return (
    <section id="trips" className="grain relative overflow-hidden bg-white py-28">
      <div className="mesh-warm" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--coral)]/35 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <EditableText as="p" id="home.trips.eyebrow" className="eyebrow text-[var(--coral)]">Upcoming Trips</EditableText>
          <h2 className="text-title mt-3 font-display text-ink text-balance">
            <EditableText as="span" id="home.trips.title.before">Travel with your</EditableText>{" "}
            <EditableText as="span" id="home.trips.title.accent" className="font-display-italic text-[var(--coral)]">amigas</EditableText>
          </h2>
          <EditableText as="p" id="home.trips.lead" className="text-lead mx-auto mt-5 max-w-2xl text-ink-soft">
            We organize group trips that create lifelong memories. From beach
            getaways to city adventures, there&apos;s something for every amiga.
          </EditableText>
        </motion.div>

        {showSkeleton ? (
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[420px] animate-pulse rounded-2xl bg-ink/5"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : homeTrips.length === 0 ? (
          <div className="mt-14 flex flex-col items-center text-center">
            <EditableText as="p" id="home.trips.emptyTitle" className="text-lead text-ink-soft">
              New trips are dropping soon. ♡
            </EditableText>
            <Link
              href="/trips"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-6 rounded-full bg-[var(--magenta)] font-semibold text-white hover:bg-[var(--brand-pink)]",
              )}
            >
              <EditableText as="span" id="home.trips.emptyCta">Browse all trips</EditableText>
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {homeTrips.map((trip, i) => {
              const u = urgency(trip);
              const { url: booking, label: bookLabel } = resolveBooking(
                trip.bookingUrl,
                trip.bookingLabel,
              );
              const cardCls = "photo-card group flex h-full flex-col rounded-2xl elevate-2";
              const cardInner = (
                <>
                    <div className="photo-card-media h-48">
                      <div
                        className={`photo-card-zoom grain absolute inset-0 bg-gradient-to-br ${trip.gradient}`}
                      >
                        <Image
                          src={trip.image}
                          alt={`${trip.destination}, ${trip.country} — group trip`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 pattern-dots opacity-10" aria-hidden="true" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/20" aria-hidden="true" />
                      </div>
                      <span className="absolute bottom-3 left-3 z-10 text-4xl drop-shadow-lg" aria-hidden="true">
                        {trip.emoji}
                      </span>
                      {trip.featured ? (
                        <Badge className="absolute left-3 top-3 z-10 border-white/25 bg-black/30 text-[10px] font-bold text-white backdrop-blur-sm">
                          Featured
                        </Badge>
                      ) : null}
                      {u ? (
                        <Badge className="absolute right-3 top-3 z-10 border-white/25 bg-black/40 text-[10px] font-bold text-white backdrop-blur-sm">
                          {u}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-display text-lg text-ink">{trip.title}</h3>
                      <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                        <Calendar className="h-4 w-4 text-[var(--coral)]" aria-hidden="true" />
                        {trip.dates}
                      </div>
                      {trip.description ? (
                        <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft line-clamp-3">
                          {trip.description}
                        </p>
                      ) : (
                        <div className="flex-1" />
                      )}
                      <div className="mt-4 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-display text-xl text-ink">
                            ${trip.price.toLocaleString()}
                          </span>
                          {trip.deposit > 0 ? (
                            <span className="ml-1 text-xs text-ink-soft">
                              / ${trip.deposit.toLocaleString()} deposit
                            </span>
                          ) : null}
                        </div>
                        {booking ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgb(255_0_153/0.25)]">
                            {bookLabel}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--coral)]">
                            View
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </div>
                </>
              );
              return (
                <motion.div
                  key={trip.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: prefersReducedMotion ? 0 : i * 0.12,
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {booking ? (
                    <a
                      href={booking}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${bookLabel} — ${trip.title}`}
                      className={cardCls}
                    >
                      {cardInner}
                    </a>
                  ) : (
                    <Link href="/trips" aria-label={`${trip.title} — ${trip.dates}`} className={cardCls}>
                      {cardInner}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {!showSkeleton && homeTrips.length > 0 ? (
          <div className="mt-10 text-center">
            <Link
              href="/trips"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full",
              )}
            >
              <EditableText as="span" id="home.trips.seeAllCta">See all trips</EditableText>
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
