"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Calendar, Users, Flame } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";
import { EditableImage } from "@/components/inline/editable-image";
import { CheckoutButtons } from "./shared";

const FACTS = [
  { icon: MapPin, label: "San Bernardino County, CA" },
  { icon: Calendar, label: "August 28–30, 2026" },
  { icon: Users, label: "Latina Women ~21+" },
];

export function CampHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="canvas-editorial grain relative overflow-hidden pb-14 pt-6 sm:pb-16 sm:pt-8">
      <div className="mesh-warm" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="mx-auto mb-4 w-24 sm:w-28"
        >
          <Image
            src="/camp/hero-graphic.png"
            alt="Amigas Summer Camp"
            width={300}
            height={300}
            priority
            unoptimized
            className="mx-auto h-auto w-full drop-shadow-[0_8px_24px_rgb(255_0_153/0.18)]"
          />
        </motion.div>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="pill-glass mx-auto mb-6 flex w-fit items-center gap-2.5 px-4 py-1.5">
            <Flame className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
            <span className="eyebrow text-[#B51760]">All-Inclusive · Aug 28–30, 2026</span>
          </div>
          <h1 className="text-editorial font-display text-ink text-balance">
            <EditableText id="camp.hero.title" as="span">Relive Summer Camp — </EditableText>
            <EditableText id="camp.hero.titleAccent" as="span" className="font-display-italic marker-swipe text-[#B51760]">but make it Amigas</EditableText>
          </h1>
          <EditableText
            id="camp.hero.subtitle"
            as="p"
            multiline
            className="text-lead font-[family-name:var(--font-sans)] mx-auto mt-6 max-w-2xl text-ink-soft"
          >
            An all-inclusive nostalgic weekend designed for Latina women craving connection, laughter, and the kind of friendships that feel like home.
          </EditableText>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {FACTS.map((f, i) => (
              <span key={f.label} className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <f.icon className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
                <EditableText id={`camp.fact.${i}`} as="span">{f.label}</EditableText>
              </span>
            ))}
          </div>
          <CheckoutButtons className="mt-9 items-center justify-center" />
        </motion.div>
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto mt-14 max-w-5xl px-4 sm:px-6 lg:px-8"
      >
        <div className="relative h-[400px] w-full overflow-hidden rounded-[2rem] elevate-4 ring-1 ring-white/60 sm:h-[500px]">
          <EditableImage
            id="camp.hero.bg"
            src="/camp/hero-photo.jpg"
            alt="Amigas laughing together at Summer Camp"
            fill
            priority
            sizes="(max-width: 1280px) 92vw, 1024px"
            className="object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#221019]/20 via-transparent to-transparent" aria-hidden="true" />
        </div>
      </motion.div>
    </section>
  );
}
