"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Phone,
  ClipboardList,
  PartyPopper,
  MapPin,
  Hotel,
  UtensilsCrossed,
  Users,
  Headphones,
  Gem,
} from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";

/**
 * StoryBrand "gives them a plan" — remove fear by showing exactly how
 * simple it is to start and what happens next. Three steps, then a grid
 * of everything handled so the value feels tangible. Anchored #how.
 */
const STEPS = [
  {
    id: "call",
    icon: Phone,
    step: "01",
    title: "Book a discovery call",
    body: "Tell us your vibe, your dates, and your budget. No pressure, no jargon — just a friendly conversation about the trip you want.",
  },
  {
    id: "design",
    icon: ClipboardList,
    step: "02",
    title: "We design your custom plan",
    body: "We craft a personalized itinerary — stays, flights, activities, reservations — and refine it with you until it feels perfect.",
  },
  {
    id: "go",
    icon: PartyPopper,
    step: "03",
    title: "Pack your bags — we've got it",
    body: "Everything booked, organized, and supported. You just show up and soak it in while we handle the details behind the scenes.",
  },
];

const INCLUDED = [
  { id: "itinerary", icon: MapPin, label: "Custom day-by-day itinerary" },
  { id: "stays", icon: Hotel, label: "Flights & handpicked stays" },
  { id: "dining", icon: UtensilsCrossed, label: "Restaurant & activity reservations" },
  { id: "group", icon: Users, label: "Group & solo-traveler coordination" },
  { id: "support", icon: Headphones, label: "On-trip support when you need it" },
  { id: "access", icon: Gem, label: "Insider access & local gems" },
];

export function ConciergePlan() {
  const reduceMotion = useReducedMotion();
  return (
    <section id="how" className="canvas-warm grain relative overflow-hidden border-t border-[#221019]/8 py-20 sm:py-24">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <EditableText as="p" id="concierge.plan.eyebrow" className="eyebrow text-[var(--brand-pink)]">
            How it works
          </EditableText>
          <h2 className="font-display text-title mt-3 text-ink text-balance">
            <EditableText as="span" id="concierge.plan.title">Three easy steps to a trip</EditableText>{" "}
            <EditableText as="span" id="concierge.plan.titleAccent" className="font-display-italic text-[var(--magenta)]">
              you&apos;ll never forget
            </EditableText>
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.id}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="glass elevate-2 relative overflow-hidden rounded-2xl p-7"
              >
                <span className="absolute right-4 top-2 font-display text-6xl leading-none text-[var(--magenta)]/10">
                  {s.step}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--magenta)] to-[var(--brand-pink)] text-white shadow-[0_6px_20px_rgb(255_0_153/0.25)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-xl text-ink">
                  <EditableText as="span" id={`concierge.plan.step.${s.id}.title`}>{s.title}</EditableText>
                </h3>
                <EditableText as="p" id={`concierge.plan.step.${s.id}.body`} className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {s.body}
                </EditableText>
              </motion.div>
            );
          })}
        </div>

        {/* What's included */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 rounded-3xl border border-[#221019]/8 bg-white/60 p-7 sm:p-9"
        >
          <h3 className="text-center font-display text-2xl text-ink">
            <EditableText as="span" id="concierge.plan.included.title">Everything handled, nothing left to you</EditableText>
          </h3>
          <div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((it) => {
              const Icon = it.icon;
              return (
                <div key={it.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--magenta)]/10 text-[var(--magenta)]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <EditableText as="span" id={`concierge.plan.included.${it.id}`} className="text-sm font-medium text-ink">
                    {it.label}
                  </EditableText>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
