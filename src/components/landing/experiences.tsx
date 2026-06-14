"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useExperiencesContent, type ExperienceItem } from "@/lib/use-site-content";

type Experience = ExperienceItem;

function ExperienceCard({ exp, hidden }: { exp: Experience; hidden?: boolean }) {
  // mr-6 (not a flex gap) so the duplicated track loops seamlessly:
  // each card owns its trailing space, making one set exactly 50% of
  // the track width that the marquee keyframe translates by.
  return (
    <article
      aria-hidden={hidden}
      className="photo-card group/card elevate-2 mr-6 w-72 shrink-0 cursor-default sm:w-80"
    >
      <div
        className={`photo-card-media photo-card-zoom aspect-[20/19] grain bg-gradient-to-br ${exp.gradient}`}
      >
        <div className="absolute inset-0 pattern-dots opacity-10" />
        {/* Fallback emoji sits behind the photo — only visible if it fails. */}
        <span className="absolute inset-0 flex items-center justify-center text-6xl drop-shadow-lg" aria-hidden="true">
          {exp.emoji}
        </span>
        {/* unoptimized: ExFAT volume breaks Next's image optimizer in dev */}
        <Image
          src={exp.image}
          alt={`${exp.title} — ${exp.location}`}
          fill
          unoptimized
          sizes="(max-width: 640px) 18rem, 20rem"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        <span className="pill-glass absolute left-3 top-3 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {exp.location}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg leading-snug text-ink">
          {exp.title}
        </h3>
      </div>
    </article>
  );
}

export function Experiences() {
  const prefersReducedMotion = useReducedMotion();
  const { items: EXPERIENCES } = useExperiencesContent();

  return (
    <section className="canvas-warm grain relative overflow-hidden py-28">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--magenta)]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="eyebrow text-[var(--magenta)]">Bucket List</p>
          <h2 className="text-title mt-3 font-display text-ink text-balance">
            Unforgettable{" "}
            <span className="font-display-italic text-[var(--brand-pink)]">experiences</span>
          </h2>
          <p className="text-lead mt-4 text-ink-soft">
            Every trip is packed with curated activities that you&apos;ll
            remember forever. Here are just a few.
          </p>
        </motion.div>
      </div>

      {/* Auto-scrolling marquee — pauses on hover. Full-bleed so cards
          glide edge to edge. Reduced-motion users get a manual rail. */}
      {prefersReducedMotion ? (
        <div className="mx-auto mt-12 flex max-w-7xl gap-6 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {EXPERIENCES.map((exp) => (
            <ExperienceCard key={exp.title} exp={exp} />
          ))}
        </div>
      ) : (
        <div className="group/rail relative mt-12 overflow-hidden">
          <div className="flex w-max animate-[marquee_44s_linear_infinite] pl-4 group-hover/rail:[animation-play-state:paused] sm:pl-6 lg:pl-8">
            {EXPERIENCES.map((exp) => (
              <ExperienceCard key={exp.title} exp={exp} />
            ))}
            {EXPERIENCES.map((exp) => (
              <ExperienceCard key={`dup-${exp.title}`} exp={exp} hidden />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
