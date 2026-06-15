"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";
import { EASE } from "./shared";

const TESTIMONIALS = [
  {
    name: "Yessica",
    location: "California",
    quote:
      "I love how we arrive to our destination knowing little about one another and leave as long lasting amigas.",
  },
  {
    name: "Alejandra",
    location: "Texas",
    quote:
      "Sharing these experiences with people who look and sound like you lets us skip the \u201cgetting to know you\u201d phase and dive right into meaningful connections. It's powerful to explore how our shared experiences, especially as Latinas, shape us as we travel the world.",
  },
  {
    name: "Christina",
    location: "California",
    quote:
      "We have empowering conversations, and I get to build relationships with total strangers that otherwise I wouldn't have met. It's very easy to make friends since we can relate at some level from our cultural experience.",
  },
];

export function CampTestimonials() {
  const reduceMotion = useReducedMotion();
  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  };

  return (
    <section className="canvas-warm relative overflow-hidden border-t border-[#FF7F50]/15 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h2 {...reveal} className="text-title font-display text-ink mx-auto max-w-2xl">
          What the amigas say about our{" "}
          <span className="font-display-italic marker-swipe text-[#B51760]">community…</span>
        </motion.h2>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reduceMotion ? 0 : i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-full flex-col rounded-2xl border border-[#221019]/8 bg-white p-7 text-left elevate-2"
            >
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-[#FF7F50] text-[#FF7F50]" aria-hidden="true" />
                ))}
              </div>
              <blockquote className="flex-1 text-ink-soft leading-relaxed">
                &ldquo;<EditableText id={`camp.testimonial.${i}.quote`} as="span" multiline>{t.quote}</EditableText>&rdquo;
              </blockquote>
              <figcaption className="mt-5">
                <EditableText id={`camp.testimonial.${i}.name`} as="span" className="block font-display text-ink">{t.name}</EditableText>
                <EditableText id={`camp.testimonial.${i}.location`} as="span" className="text-xs text-ink-soft">{t.location}</EditableText>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
