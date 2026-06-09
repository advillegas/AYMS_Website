"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";
import { useTestimonials, type Testimonial } from "@/lib/use-testimonials";

function TestimonialCard({ t, hidden }: { t: Testimonial; hidden?: boolean }) {
  return (
    <div aria-hidden={hidden} className="mr-6 w-80 shrink-0">
      <FlipCard
        className="h-80 cursor-pointer rounded-3xl"
        front={
          <div className="glass elevate-2 flex h-full flex-col justify-between rounded-3xl p-7">
            <div>
              <Quote className="h-7 w-7 text-[#FF0099]/30" aria-hidden="true" />
              <div className="mt-3 flex items-center gap-1" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-[#FF0099] text-[#FF0099]" aria-hidden="true" />
                ))}
              </div>
              <p className="font-display mt-4 text-xl leading-snug text-ink line-clamp-5">
                &ldquo;{t.en}&rdquo;
              </p>
            </div>
            <div className="mt-5 flex items-center gap-3 border-t border-[#221019]/10 pt-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className={`bg-gradient-to-br ${t.gradient} text-white font-bold text-xs`}>
                  {t.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-bold text-ink">{t.name}</p>
                <p className="text-[11px] text-ink-soft">{t.trip}</p>
              </div>
            </div>
          </div>
        }
        back={
          <div className={`flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br ${t.gradient} p-7 text-white`}>
            <div>
              <Quote className="h-7 w-7 text-white/40" aria-hidden="true" />
              <div className="mt-3 flex items-center gap-1" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-white text-white" aria-hidden="true" />
                ))}
              </div>
              <p className="font-display-italic mt-4 text-xl leading-snug text-white/95 line-clamp-5">
                &ldquo;{t.es}&rdquo;
              </p>
            </div>
            <div className="mt-5 flex items-center gap-3 border-t border-white/20 pt-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-white/20 text-white font-bold text-xs backdrop-blur-sm">
                  {t.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-bold">{t.name}</p>
                <p className="text-[11px] text-white/70">{t.trip}</p>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}

export function Testimonials() {
  const prefersReducedMotion = useReducedMotion();
  // Reads from Firestore (seeded from TESTIMONIALS_SEED) with the static
  // seed as the offline fallback — see src/lib/use-testimonials.ts.
  const { testimonials } = useTestimonials();

  return (
    <section className="canvas-editorial grain relative overflow-hidden py-32">
      <div className="mesh-warm" aria-hidden="true" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="eyebrow text-[#B51760]">Testimonials</p>
          <h2 className="font-display text-title mt-3 text-ink text-balance">
            See what it&apos;s{" "}
            <span className="font-display-italic text-[#FF0099]">really like</span>
          </h2>
          <p className="text-lead mt-4 max-w-xl text-ink-soft leading-relaxed">
            Honest words from amigas who showed up solo and left with a second
            family.
          </p>
        </motion.div>
      </div>

      {/* Auto-scrolling marquee — pauses on hover (and while flipping a
          card). Reduced-motion users get a manual scroll rail. */}
      {prefersReducedMotion ? (
        <div className="mx-auto mt-12 flex max-w-7xl gap-6 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {testimonials.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>
      ) : (
        <div className="group/rail relative mt-12 overflow-hidden">
          <div className="flex w-max animate-[marquee_55s_linear_infinite] pl-4 group-hover/rail:[animation-play-state:paused] sm:pl-6 lg:pl-8">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} t={t} />
            ))}
            {testimonials.map((t) => (
              <TestimonialCard key={`dup-${t.name}`} t={t} hidden />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
