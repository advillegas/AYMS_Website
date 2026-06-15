"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";
import { EditableImage } from "@/components/inline/editable-image";
import { EASE } from "./shared";

const INCLUSIONS = [
  "2-night stay, bunk-bed style",
  "All meals",
  "Open bar",
  "All activities",
  "Camp Counselors",
  "Surprise Gift",
];

const ACTIVITIES = [
  "Campfire and S'mores",
  "Movie Night",
  "Sound bath",
  "Pool Party",
  "Zip Lining",
  "Bonding activity",
  "Morning yoga",
  "Special guest moments",
];

export function CampInclusions() {
  const reduceMotion = useReducedMotion();
  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  };

  return (
    <section className="canvas-editorial relative py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <motion.div {...reveal}>
          <p className="eyebrow text-[#FF7F50] mb-3">Here&apos;s What You Get</p>
          <h2 className="text-title font-display text-ink">
            Camp{" "}
            <span className="font-display-italic marker-swipe text-[#B51760]">Inclusions</span>
          </h2>
          <ul className="mt-7 space-y-3">
            {INCLUSIONS.map((item, i) => (
              <li
                key={i}
                className="lift flex items-center gap-3 rounded-2xl border border-[#221019]/8 bg-white px-5 py-3.5 elevate-2"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7F50]/20 to-[#FF0099]/10 text-[#FF7F50]">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <EditableText id={`camp.inclusion.${i}`} as="span" className="font-medium text-ink">{item}</EditableText>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...reveal}>
          <p className="eyebrow text-[#FF7F50] mb-3">The Lineup</p>
          <h2 className="text-title font-display text-ink">
            <span className="font-display-italic marker-swipe text-[#B51760]">Activities</span>
          </h2>
          <div className="mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {ACTIVITIES.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-ink-soft">
                <Sparkles className="h-4 w-4 shrink-0 text-[#FF0099]" aria-hidden="true" />
                <EditableText id={`camp.activity.${i}`} as="span" className="font-medium">{item}</EditableText>
              </div>
            ))}
          </div>
          <div className="relative mt-8 aspect-[683/1024] w-full max-w-sm overflow-hidden rounded-3xl elevate-2">
            <EditableImage
              id="camp.activities.photo"
              src="/camp/activities.png"
              alt="Amigas Summer Camp activities"
              fill
              sizes="(max-width: 1024px) 100vw, 384px"
              className="object-cover"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
