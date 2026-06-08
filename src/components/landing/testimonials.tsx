"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlipCard } from "@/components/ui/flip-card";
import { useTestimonials } from "@/lib/use-testimonials";

export function Testimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  // Reads from Firestore (seeded from TESTIMONIALS_SEED) with the static
  // seed as the offline fallback — see src/lib/use-testimonials.ts.
  const { testimonials } = useTestimonials();

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <section className="grain relative overflow-hidden py-32 bg-[#1a0a12]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#2A0A1E] via-[#1a0a12] to-[#1a0a12]" />
      <div className="aurora opacity-35" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="font-detail text-base font-semibold italic tracking-[0.12em] text-[#FACDE8]/70">
              Testimonials
            </p>
            <h2 className="text-title mt-3 font-[family-name:var(--font-heading)] font-extrabold text-white">
              Hear From Our{" "}
              <span className="text-gradient-brand">Amigas</span>
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button aria-label="Scroll testimonials left" variant="outline" size="icon" onClick={() => scroll("left")} className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/30">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button aria-label="Scroll testimonials right" variant="outline" size="icon" onClick={() => scroll("right")} className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/30">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </motion.div>

        {/* Horizontal scroll carousel */}
        <div
          ref={scrollRef}
          className="mt-10 flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={prefersReducedMotion ? false : { opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: prefersReducedMotion ? 0 : i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 w-80 snap-center"
            >
              <FlipCard
                className="ring-gradient h-72 cursor-pointer rounded-3xl"
                front={
                  <div className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm">
                    <div>
                      <div className="mb-3 text-2xl text-[#FF0099]">♡</div>
                      <p className="text-sm text-white/65 italic leading-relaxed line-clamp-5 font-detail">
                        &ldquo;{t.en}&rdquo;
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={`bg-gradient-to-br ${t.gradient} text-white font-bold text-xs`}>
                          {t.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold text-white">{t.name}</p>
                        <p className="text-[10px] text-white/45">{t.trip}</p>
                      </div>
                    </div>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br ${t.gradient} p-6 text-white`}>
                    <div>
                      <div className="mb-3 text-2xl text-white/70">♡</div>
                      <p className="text-sm text-white/90 italic leading-relaxed line-clamp-5 font-detail">
                        &ldquo;{t.es}&rdquo;
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-white/20 text-white font-bold text-xs backdrop-blur-sm">
                          {t.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-[10px] text-white/60">{t.trip}</p>
                      </div>
                    </div>
                  </div>
                }
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom fade into light bg */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FFF7FB] to-transparent" />
    </section>
  );
}
