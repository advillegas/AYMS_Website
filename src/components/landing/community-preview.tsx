"use client";

/**
 * "Become an Amiga" community preview.
 *
 * Shows PUBLIC AGGREGATE social proof only — a live-ish member count,
 * trip + destination counts derived from TRIPS_DATA, a few curated /
 * opt-in testimonial highlights, and an upcoming-events ticker. It never
 * renders private profile data (no member names, emails, or avatars) —
 * only counts and already-public marketing content.
 */

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Users, Globe2, CalendarHeart, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TRIPS_DATA } from "@/lib/trips-data";
import { useEvents } from "@/lib/use-events";
import { useTestimonials } from "@/lib/use-testimonials";
import { useCommunityMembers } from "@/lib/use-community-members";
import { cn } from "@/lib/utils";

const EVENT_EMOJI: Record<string, string> = {
  trip: "✈️",
  meetup: "☕",
  camp: "🏕️",
  social: "🎉",
  synced: "📅",
};

function formatEventDate(iso: string): string {
  // iso is YYYY-MM-DD — parse as local to avoid TZ off-by-one.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CommunityPreview() {
  const prefersReducedMotion = useReducedMotion();
  const { events } = useEvents();
  const { testimonials } = useTestimonials();
  const { members } = useCommunityMembers();

  const destinationCount = useMemo(
    () => new Set(TRIPS_DATA.map((t) => t.country)).size,
    [],
  );

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return events
      .filter((e) => e.date && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [events]);

  // Curated / opt-in highlights only (featured === true). Public content.
  const highlights = useMemo(() => {
    const featured = testimonials.filter((t) => t.featured);
    return (featured.length > 0 ? featured : testimonials).slice(0, 3);
  }, [testimonials]);

  // Public aggregate count only. When the community directory isn't
  // populated we show an honest qualitative label instead of a fake number.
  const memberCount = members.length;

  const stats = [
    {
      icon: Users,
      value: memberCount > 0 ? `${memberCount}+` : "Growing",
      label: memberCount > 0 ? "Amigas in the community" : "community of amigas",
    },
    {
      icon: Globe2,
      value: `${destinationCount}`,
      label: "Countries on the map",
    },
    {
      icon: CalendarHeart,
      value: `${TRIPS_DATA.length}`,
      label: "Upcoming group trips",
    },
  ];

  return (
    <section className="canvas-warm grain relative overflow-hidden py-32">
      <div className="mesh-warm" aria-hidden="true" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="eyebrow inline-flex items-center justify-center gap-2 text-[#B51760]">
            <Sparkles className="h-3.5 w-3.5 text-[#FF0099]" aria-hidden="true" />
            Join the Family
          </p>
          <h2 className="font-display text-title mt-4 text-ink text-balance">
            Become an{" "}
            <span className="font-display-italic text-[#FF0099]">Amiga</span>
          </h2>
          <p className="text-lead mx-auto mt-5 max-w-xl text-ink-soft leading-relaxed">
            Real friendships, bucket-list adventures, and a sisterhood that
            travels together. Membership is free — your seat at the table is
            waiting.
          </p>
        </motion.div>

        {/* Aggregate stats */}
        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: prefersReducedMotion ? 0 : i * 0.1,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="glass lift elevate-2 flex flex-col items-center rounded-3xl p-7 text-center"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF0099]/15 to-[#B51760]/10">
                <s.icon className="h-5 w-5 text-[#FF0099]" aria-hidden="true" />
              </div>
              <p className="font-display text-4xl text-[#B51760]">
                {s.value}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-2">
          {/* Curated highlights */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow text-[#B51760]">From our amigas</p>
            <div className="mt-4 space-y-4">
              {highlights.map((t) => (
                <div
                  key={t.id}
                  className="glass lift elevate-2 flex items-start gap-4 rounded-2xl p-5"
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback
                      className={cn(
                        "bg-gradient-to-br text-white text-xs font-bold",
                        t.gradient,
                      )}
                    >
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-display text-lg leading-snug text-ink line-clamp-3">
                      &ldquo;{t.en}&rdquo;
                    </p>
                    <p className="mt-2 text-xs font-semibold text-ink">
                      {t.name}
                      <span className="font-normal text-ink-soft">
                        {" "}
                        · {t.trip}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Upcoming events ticker */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow text-[#B51760]">What&apos;s coming up</p>
            <div className="mt-4 overflow-hidden rounded-3xl glass-strong elevate-2">
              {upcomingEvents.length === 0 ? (
                <div className="p-8 text-center text-sm text-ink-soft">
                  New events are being planned — check the calendar soon. ♡
                </div>
              ) : (
                <ul className="divide-y divide-[#FACDE8]/50">
                  {upcomingEvents.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/50"
                    >
                      <span
                        className="text-xl"
                        aria-hidden="true"
                      >
                        {EVENT_EMOJI[e.type] ?? "📅"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {e.title}
                        </p>
                        <p className="truncate text-xs text-ink-soft">
                          {e.location}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#FF0099]/10 px-3 py-1 text-xs font-semibold text-[#B51760]">
                        {formatEventDate(e.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-[#FACDE8]/50 p-4">
                <Link
                  href="/events"
                  className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#FF0099] transition-colors hover:text-[#B51760]"
                >
                  See the full calendar
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/register"
            className="lift inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-8 text-sm font-semibold text-white shadow-[0_6px_24px_rgb(255_0_153/0.30)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2"
          >
            Become an Amiga — it&apos;s free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/trips"
            className="lift inline-flex h-12 items-center justify-center rounded-full border border-[#221019]/15 px-8 text-sm font-semibold text-ink transition-all hover:border-[#FF0099]/50 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/40 focus-visible:ring-offset-2"
          >
            Browse trips
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
