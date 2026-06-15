"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";
import { EditableImage } from "@/components/inline/editable-image";
import { EASE } from "./shared";

const ABOUT_PHOTOS = [
  "/camp/about-1.jpg",
  "/camp/about-2.jpg",
  "/camp/about-3.png",
  "/camp/about-4.png",
];

export function CampAbout() {
  const reduceMotion = useReducedMotion();
  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  };

  return (
    <section className="canvas-warm relative overflow-hidden border-t border-[#FF7F50]/15 py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <motion.div {...reveal}>
          <p className="eyebrow text-[#FF7F50] mb-3">The Experience</p>
          <h2 className="text-title font-display text-ink">
            What is{" "}
            <span className="font-display-italic marker-swipe text-[#B51760]">
              Amigas Summer Camp?
            </span>
          </h2>
          <EditableText id="camp.about.p1" as="p" multiline className="mt-5 text-lead text-ink-soft">
            Amigas Summer Camp is a grown-girl reimagining of the summer camp experience — designed for Latina women who want to unplug, reconnect, and build real friendships in a joyful, supportive space.
          </EditableText>
          <EditableText id="camp.about.p2" as="p" className="mt-4 font-display text-lg text-ink">
            This isn&apos;t a retreat where you sit quietly all day.
          </EditableText>
          <ul className="mt-4 space-y-2.5">
            {[
              "It's laughter around a cozy fire.",
              "Late-night talks about family traditions.",
              "Inside jokes that turn into lifelong bonds.",
            ].map((line, i) => (
              <li key={i} className="flex items-start gap-3 text-ink-soft">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF0099]/10 text-[#FF0099]">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <EditableText id={`camp.about.line.${i}`} as="span">{line}</EditableText>
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div
          {...reveal}
          className="grid grid-cols-2 gap-4"
        >
          {ABOUT_PHOTOS.map((src, i) => (
            <div
              key={src}
              className={`relative overflow-hidden rounded-2xl elevate-2 ${
                i % 3 === 0 ? "aspect-[4/3]" : "aspect-square"
              }`}
            >
              <EditableImage id={`camp.about.photo.${i}`} src={src} alt="" fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
