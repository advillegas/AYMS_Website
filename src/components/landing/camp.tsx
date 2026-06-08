"use client";

import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Users, Sun, Star } from "lucide-react";
import Link from "next/link";

const DETAILS = [
  { icon: Calendar, en: "July 15–18, 2026", es: "15–18 de Julio, 2026" },
  { icon: MapPin, en: "Camp Wilderness, CA", es: "Campamento Wilderness, CA" },
  { icon: Users, en: "Limited to 50 Amigas", es: "Limitado a 50 Amigas" },
  { icon: Sun, en: "3 Days of Fun", es: "3 Días de Diversión" },
];

export function Camp() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section id="camp" className="relative py-32 overflow-hidden bg-[#FFF7FB]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#FACDE8]/20 via-[#FFF7FB] to-[#FFF7FB]" />
      <div className="absolute inset-0 pattern-grid opacity-[0.25]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 px-4 py-1.5 text-xs font-bold tracking-[0.18em] uppercase rounded-full shadow-[0_4px_14px_rgb(255_0_153/0.30)]">
              Summer 2026
            </Badge>
            <h2 className="text-title font-[family-name:var(--font-heading)] font-extrabold text-[#6A1B4D] text-balance">
              Amigas Summer{" "}
              <span className="text-gradient-brand">Camp 2026</span>
            </h2>
            <p className="text-lead mt-5 text-[#6A1B4D]/80 leading-relaxed">
              Three days of bonding, growth, and unforgettable memories. Our
              annual camp brings amigas together for workshops, outdoor
              adventures, and sisterhood.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {DETAILS.map((item) => (
                <div
                  key={item.en}
                  className="glass lift group flex items-center gap-3 rounded-2xl p-4 cursor-default elevate-2"
                >
                  <item.icon className="h-5 w-5 shrink-0 text-[#FF0099]" aria-hidden="true" />
                  <span className="text-sm font-medium text-[#6A1B4D]">
                    <span className="group-hover:hidden">{item.en}</span>
                    <span className="hidden group-hover:inline text-[#FF0099] font-semibold">{item.es}</span>
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "lift mt-8 h-14 rounded-full bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] text-white border-0 hover:brightness-110 shadow-[0_8px_30px_rgb(255_0_153/0.30)] font-semibold px-10 text-base",
              )}
            >
              Register Now ♡
            </Link>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="glass-strong elevate-float aspect-[4/3] overflow-hidden rounded-3xl p-10 flex items-center justify-center relative">
              <div className="absolute inset-0 pattern-dots opacity-15" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF0099]/8 via-transparent to-[#FACDE8]/20" />
              <div className="relative text-center">
                <motion.div
                  animate={prefersReducedMotion ? undefined : { rotate: [0, 5, -5, 0] }}
                  transition={prefersReducedMotion ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="ring-gradient mx-auto h-28 w-28 rounded-full bg-gradient-to-br from-[#FF0099] via-[#B51760] to-[#FF7F50] flex items-center justify-center shadow-2xl"
                >
                  <Sun className="h-14 w-14 text-white" aria-hidden="true" />
                </motion.div>
                <p className="mt-6 text-3xl font-extrabold font-[family-name:var(--font-heading)] text-gradient-brand">
                  Camp AYMS
                </p>
                <p className="mt-2 text-[#6A1B4D]/80 text-sm tracking-[0.2em] uppercase font-semibold">
                  connect · empower · celebrate
                </p>
                <div className="mt-4 flex justify-center gap-1" aria-hidden="true">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#F4B860] text-[#F4B860]" />
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
