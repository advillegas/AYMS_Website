"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Layers, Clock, HeartCrack } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";

/**
 * StoryBrand "a character has a problem" — name the external, internal,
 * and philosophical pain so the prospect feels understood. Three cards
 * keep it scannable; the closing line bridges to the guide.
 */
const PROBLEMS = [
  {
    icon: Layers,
    id: "tabs",
    title: "A hundred open tabs",
    body: "Flights here, hotels there, ten blog lists and zero confidence you picked the right one. Planning becomes a part-time job you never applied for.",
  },
  {
    icon: Clock,
    id: "time",
    title: "No time to do it right",
    body: "Between work, family, and life, the trip keeps slipping. \u201CSomeday\u201D turns into another year of watching everyone else\u2019s vacation photos.",
  },
  {
    icon: HeartCrack,
    id: "risk",
    title: "Scared to get it wrong",
    body: "Precious PTO and real money are on the line. One wrong hotel or tourist-trap day and the whole trip\u2014and the memory\u2014pays for it.",
  },
];

export function ConciergeProblem() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="canvas-warm grain relative overflow-hidden border-t border-[#221019]/8 py-20 sm:py-24">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <EditableText as="p" id="concierge.problem.eyebrow" className="eyebrow text-[var(--brand-pink)]">
            Sound familiar?
          </EditableText>
          <h2 className="font-display text-title mt-3 text-ink text-balance">
            <EditableText as="span" id="concierge.problem.title">
              Planning the trip shouldn&apos;t feel like
            </EditableText>{" "}
            <EditableText as="span" id="concierge.problem.titleAccent" className="font-display-italic text-[var(--magenta)]">
              a second job
            </EditableText>
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.id}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="glass elevate-2 rounded-2xl p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#221019]/8 to-[#221019]/4">
                  <Icon className="h-5 w-5 text-[#B51760]" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg text-ink">
                  <EditableText as="span" id={`concierge.problem.${p.id}.title`}>{p.title}</EditableText>
                </h3>
                <EditableText as="p" id={`concierge.problem.${p.id}.body`} className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {p.body}
                </EditableText>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-12 max-w-2xl text-center text-lead text-ink"
        >
          <EditableText as="span" id="concierge.problem.bridge">
            You deserve the magic without the migraine. That&apos;s where we come in.
          </EditableText>
        </motion.p>
      </div>
    </section>
  );
}
