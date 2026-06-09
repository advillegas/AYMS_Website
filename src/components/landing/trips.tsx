"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, Heart, Star } from "lucide-react";
import Link from "next/link";
import { FlipCard } from "@/components/ui/flip-card";

const TRIPS = [
  {
    en: { title: "Cancún, Mexico", desc: "All-inclusive resort adventure on the Caribbean coast. Sun, culture, and sisterhood." },
    es: { title: "Cancún, México", desc: "Aventura todo incluido en la costa del Caribe. Sol, cultura y hermandad." },
    date: "August 20–25, 2026",
    tag: "International",
    gradient: "from-primary/25 via-magenta/20 to-rosa/15",
    gradientBack: "from-primary via-magenta to-coral",
    emoji: "🇲🇽",
  },
  {
    en: { title: "Wine Country, Napa", desc: "A relaxing weekend of wine tastings, spa treatments, and meaningful conversations." },
    es: { title: "País del Vino, Napa", desc: "Un fin de semana relajante de catas de vino, spa y conversaciones significativas." },
    date: "October 10–12, 2026",
    tag: "Domestic",
    gradient: "from-coral/25 via-coral/20 to-rosa/15",
    gradientBack: "from-coral via-coral to-primary",
    emoji: "🍷",
  },
  {
    en: { title: "NYC Weekend", desc: "The city that never sleeps! Broadway, food tours, and shopping with your amigas." },
    es: { title: "Fin de Semana en NYC", desc: "¡La ciudad que nunca duerme! Broadway, tours de comida y compras con tus amigas." },
    date: "November 7–9, 2026",
    tag: "Domestic",
    gradient: "from-brand-pink/25 via-primary/20 to-rosa/15",
    gradientBack: "from-brand-pink via-magenta to-primary",
    emoji: "🗽",
  },
];

export function Trips() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section id="trips" className="grain relative overflow-hidden bg-white py-28">
      <div className="mesh-warm" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF7F50]/35 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <p className="eyebrow text-[#FF7F50]">Upcoming Trips</p>
          <h2 className="text-title mt-3 font-display text-ink text-balance">
            Travel with your{" "}
            <span className="font-display-italic text-[#FF7F50]">amigas</span>
          </h2>
          <p className="text-lead mx-auto mt-5 max-w-2xl text-ink-soft">
            We organize group trips that create lifelong memories. From beach
            getaways to city adventures, there&apos;s something for every amiga.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TRIPS.map((trip, i) => (
            <motion.div
              key={trip.en.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: prefersReducedMotion ? 0 : i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <FlipCard
                className="h-[440px] cursor-pointer rounded-2xl"
                front={
                  <article className="photo-card flex h-full flex-col elevate-2">
                    <div className={`photo-card-media photo-card-zoom h-48 grain flex items-center justify-center bg-gradient-to-br ${trip.gradient}`}>
                      <div className="absolute inset-0 pattern-dots opacity-15" />
                      <span className="text-6xl relative z-10 drop-shadow-lg" aria-hidden="true">{trip.emoji}</span>
                      <span className="glass-control absolute right-3 top-3 h-9 w-9" aria-hidden="true">
                        <Heart className="h-4 w-4 text-[#FF0099]" />
                      </span>
                      <Badge className="absolute left-3 top-3 border-[#FF7F50]/25 bg-[#FF7F50]/15 text-[10px] font-bold text-[#B5481E] backdrop-blur-sm">{trip.tag}</Badge>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-display text-lg text-ink">{trip.en.title}</h3>
                      <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                        <Calendar className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
                        {trip.date}
                      </div>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{trip.en.desc}</p>
                      <div className="mt-4 flex items-end justify-between">
                        <span className="text-xs font-medium text-[#FF7F50]">Hover to see in Spanish →</span>
                        <span className="inline-flex items-center gap-1 text-sm text-ink-soft">
                          <Star className="h-3.5 w-3.5 fill-[#FF7F50] text-[#FF7F50]" aria-hidden="true" />
                          5.0
                        </span>
                      </div>
                    </div>
                  </article>
                }
                back={
                  <div className={`flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${trip.gradientBack} text-white`}>
                    <div className="relative flex h-48 items-center justify-center bg-black/10">
                      <div className="absolute inset-0 pattern-dots opacity-10" />
                      <span className="text-6xl relative z-10 drop-shadow-lg" aria-hidden="true">{trip.emoji}</span>
                      <Badge className="absolute left-3 top-3 border-white/25 bg-white/15 text-[10px] font-bold text-white backdrop-blur-sm">{trip.tag}</Badge>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-display text-lg">{trip.es.title}</h3>
                      <div className="mt-2 flex items-center gap-2 text-sm text-white/75">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        {trip.date}
                      </div>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-white/90">{trip.es.desc}</p>
                      <div className="mt-4">
                        <Link href="/register" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full rounded-full border-white/25 bg-white/10 font-semibold text-white hover:bg-white/20")}>
                          Join Trip ♡
                        </Link>
                      </div>
                    </div>
                  </div>
                }
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
