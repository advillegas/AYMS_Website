"use client";

import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Users, Sun, Star } from "lucide-react";
import Link from "next/link";

const DETAILS = [
  { icon: Calendar, en: "August 28–30, 2026", es: "28–30 de Agosto, 2026" },
  { icon: MapPin, en: "San Bernardino County, CA", es: "Condado de San Bernardino, CA" },
  { icon: Users, en: "Latina Women 21+", es: "Mujeres Latinas 21+" },
  { icon: Sun, en: "All-Inclusive Weekend", es: "Fin de Semana Todo Incluido" },
];

export function Camp() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section id="camp" className="grain relative overflow-hidden bg-white py-28 sm:py-32">
      <div className="mesh-warm opacity-60" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--coral)]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-5 rounded-full border-0 bg-gradient-to-r from-[var(--coral)] to-[var(--brand-pink)] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[0_4px_14px_rgb(255_127_80/0.30)]">
              Summer 2026
            </Badge>
            <h2 className="text-title font-display text-ink text-balance">
              Amigas Summer{" "}
              <span className="font-display-italic marker-magenta">Camp 2026</span>
            </h2>
            <p className="text-lead mt-6 leading-relaxed text-ink-soft">
              Three days of bonding, growth, and unforgettable memories. Our
              annual camp brings amigas together for workshops, outdoor
              adventures, and sisterhood.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {DETAILS.map((item) => (
                <div
                  key={item.en}
                  className="glass lift elevate-2 group flex cursor-default items-center gap-3 rounded-2xl p-4"
                >
                  <item.icon className="h-5 w-5 shrink-0 text-[var(--coral)]" aria-hidden="true" />
                  <span className="text-sm font-medium text-ink">
                    <span className="group-hover:hidden">{item.en}</span>
                    <span className="hidden font-semibold text-[var(--brand-pink)] group-hover:inline">{item.es}</span>
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/camp"
              className={cn(
                buttonVariants({ size: "lg" }),
                "lift mt-8 h-14 rounded-full border-0 bg-gradient-to-r from-[var(--magenta)] via-[var(--brand-pink)] to-[var(--magenta)] px-10 text-base font-semibold text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110",
              )}
            >
              Explore Camp ♡
            </Link>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="glass-strong elevate-float relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[2rem] p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--coral)]/10 via-transparent to-[#FACDE8]/25" />
              <div className="relative text-center">
                <motion.div
                  animate={prefersReducedMotion ? undefined : { rotate: [0, 5, -5, 0] }}
                  transition={prefersReducedMotion ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[var(--magenta)] via-[var(--brand-pink)] to-[var(--coral)] shadow-2xl"
                >
                  <Sun className="h-14 w-14 text-white" aria-hidden="true" />
                </motion.div>
                <p className="mt-6 font-display text-4xl text-gradient-brand">
                  Camp AYMS
                </p>
                <p className="eyebrow mt-3 text-ink-soft">
                  connect · empower · celebrate
                </p>
                <div className="mt-4 flex justify-center gap-1" aria-hidden="true">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[var(--coral)] text-[var(--coral)]" />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
