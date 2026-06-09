"use client";

/**
 * Live "Featured Spotlight" shown on /featured when no CMS/builder
 * content is published. Replaces the old static "Coming Soon" fallback
 * with real, dynamic content:
 *
 *  - the next featured group trip (soonest upcoming, available first)
 *    from TRIPS_DATA
 *  - an upcoming-events list via useEvents
 *  - an embedded newsletter capture block (source "featured", tagged
 *    with the spotlighted tripId) — capture only, never sends email
 *  - CTAs to /trips and /events
 *
 * Matches the dark /featured aesthetic (bg-[#1A0814], white text) using
 * the brand gradient + glass utilities.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  MapPin,
  CalendarDays,
  Users,
  ArrowRight,
  Send,
  Loader2,
  Plane,
} from "lucide-react";
import { TRIPS_DATA, type Trip } from "@/lib/trips-data";
import { useEvents } from "@/lib/use-events";
import { useNewsletter } from "@/lib/use-newsletter";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse the leading date out of a trips "dates" string like
 * "August 20–25, 2026" → a sortable Date. Falls back to a far-future
 * date when it can't be parsed so unparseable trips sort last.
 */
function tripStart(t: Trip): number {
  const m = t.dates.match(/([A-Za-z]+)\s+(\d{1,2}).*?(\d{4})/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(`${m[1]} ${m[2]}, ${m[3]}`).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function pickSpotlightTrip(): Trip {
  const now = Date.now();
  const upcoming = TRIPS_DATA.filter((t) => tripStart(t) >= now).sort(
    (a, b) => tripStart(a) - tripStart(b),
  );
  const pool = upcoming.length > 0 ? upcoming : [...TRIPS_DATA];
  // Prefer a bookable (available) trip; otherwise the soonest of any status.
  return pool.find((t) => t.status === "available") ?? pool[0];
}

function formatEventDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function SpotlightSignup({ tripId }: { tripId: string }) {
  const { submitting, subscribe } = useNewsletter();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    // Capture only — persists to Firestore, never sends email.
    const result = await subscribe({
      email: trimmed,
      source: "featured",
      tripId,
    });
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setEmail("");
    setDone(true);
  }

  if (done) {
    return (
      <p
        role="status"
        className="rounded-2xl border border-[#FF0099]/30 bg-[#FF0099]/10 px-5 py-4 text-sm font-medium text-[#FFB3D0]"
      >
        You&apos;re on the list — we&apos;ll keep you posted on this trip and
        more. ♡
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="spotlight-newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="spotlight-newsletter-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={submitting}
        className="h-12 flex-1 rounded-full border border-white/12 bg-white/[0.06] px-5 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus-visible:border-[#FF0099]/40 focus-visible:ring-2 focus-visible:ring-[#FF0099]/40 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="lift inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] px-7 text-sm font-semibold text-white shadow-[0_6px_24px_rgb(255_0_153/0.30)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A0814] disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Joining…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Keep me posted
          </>
        )}
      </button>
    </form>
  );
}

export function FeaturedSpotlight() {
  const reduceMotion = useReducedMotion();
  const { events } = useEvents();

  const trip = useMemo(() => pickSpotlightTrip(), []);

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events
      .filter((e) => e.date && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [events]);

  const statusLabel =
    trip.status === "available"
      ? `${trip.spotsLeft} spots left`
      : trip.status === "waitlist"
        ? "Waitlist open"
        : trip.status === "sold-out"
          ? "Sold out"
          : "Coming soon";

  return (
    <section className="grain relative overflow-hidden bg-[#1A0814] py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] via-[#1a0a12] to-[#1A0814]" />
      <div className="aurora opacity-50" />
      <div className="absolute inset-0 pattern-dots opacity-[0.07]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mx-auto mb-6 flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#FFB3D0]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FFB3D0]">
              Featured Spotlight
            </span>
          </div>
          <h1 className="text-hero font-[family-name:var(--font-heading)] font-extrabold text-white text-balance">
            Your Next <span className="text-gradient-brand">Adventure</span>
          </h1>
          <p className="text-lead mx-auto mt-5 max-w-lg text-white/70">
            The trip everyone&apos;s talking about — plus what&apos;s coming up
            in the community. Grab your spot before it&apos;s gone.
          </p>
        </motion.div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-5">
          {/* Spotlight trip card */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-3"
          >
            <div className="elevate-float overflow-hidden rounded-3xl border border-white/12 bg-white/[0.05] backdrop-blur-md">
              <div
                className={`relative h-44 overflow-hidden bg-gradient-to-br ${trip.gradient}`}
              >
                {/* unoptimized: ExFAT volume breaks Next's image optimizer in dev */}
                <Image
                  src={trip.image}
                  alt={`${trip.destination}, ${trip.country}`}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" aria-hidden="true" />
                <span className="absolute bottom-3 left-4 text-3xl drop-shadow-lg" aria-hidden="true">
                  {trip.emoji}
                </span>
                <span className="absolute right-4 top-4 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {statusLabel}
                </span>
              </div>
              <div className="p-7">
                <h2 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-white">
                  {trip.title}
                </h2>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#FFB3D0]" aria-hidden="true" />
                    {trip.destination}, {trip.country}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays
                      className="h-4 w-4 text-[#FFB3D0]"
                      aria-hidden="true"
                    />
                    {trip.dates}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#FFB3D0]" aria-hidden="true" />
                    {trip.duration}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/70">
                  {trip.description}
                </p>

                {trip.highlights.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {trip.highlights.slice(0, 4).map((h) => (
                      <li
                        key={h}
                        className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/65"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="text-white">
                    <span className="text-2xl font-extrabold">
                      ${trip.price.toLocaleString()}
                    </span>
                    <span className="ml-1 text-xs text-white/50">
                      / from ${trip.deposit.toLocaleString()} deposit
                    </span>
                  </div>
                  <Link
                    href="/trips"
                    className="lift sm:ml-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] px-6 text-sm font-semibold text-white shadow-[0_6px_24px_rgb(255_0_153/0.30)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A0814]"
                  >
                    View trip details
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Side column: upcoming events + newsletter capture */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 lg:col-span-2"
          >
            {/* Upcoming events */}
            <div className="overflow-hidden rounded-3xl border border-white/12 bg-white/[0.05] backdrop-blur-md">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
                <Plane className="h-4 w-4 text-[#FFB3D0]" aria-hidden="true" />
                <h3 className="text-sm font-bold text-white">Coming up</h3>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-white/50">
                  New events are being planned — check back soon. ♡
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {upcomingEvents.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white/90">
                          {e.title}
                        </p>
                        <p className="truncate text-xs text-white/45">
                          {e.location}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#FF0099]/15 px-2.5 py-1 text-xs font-semibold text-[#FFB3D0]">
                        {formatEventDate(e.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-white/10 p-4">
                <Link
                  href="/events"
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#FFB3D0] transition-colors hover:text-white"
                >
                  See all events
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Newsletter capture */}
            <div className="rounded-3xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur-md">
              <h3 className="text-base font-bold text-white">
                Don&apos;t miss the next one
              </h3>
              <p className="mt-1 text-sm text-white/55">
                Get new trips &amp; events in your inbox. No spam, ever.
              </p>
              <div className="mt-4">
                <SpotlightSignup tripId={trip.id} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
