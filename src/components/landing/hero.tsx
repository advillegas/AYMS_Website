"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart, Users, Sparkles, ArrowDown } from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";

const PILLARS = [
  {
    icon: Heart,
    en: { label: "Connect", desc: "Build lifelong friendships" },
    es: { label: "Conectar", desc: "Construye amistades para toda la vida" },
    accent: "from-[#FF0099] to-[#C2266A]",
  },
  {
    icon: Users,
    en: { label: "Empower", desc: "Grow together as a community" },
    es: { label: "Empoderar", desc: "Crecer juntas como comunidad" },
    accent: "from-[#B51760] to-[#9B2C8A]",
  },
  {
    icon: Sparkles,
    en: { label: "Celebrate", desc: "Travel and create memories" },
    es: { label: "Celebrar", desc: "Viajar y crear recuerdos" },
    accent: "from-[#C44B3F] to-[#FF0099]",
  },
];

const STATS = [
  { value: "2k+", label: "amigas" },
  { value: "30+", label: "trips" },
  { value: "12", label: "countries" },
];

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section
      id="home"
      className="canvas-editorial grain relative min-h-screen overflow-hidden"
    >
      {/* Warm radial mesh backdrop — airy, premium, light */}
      <div className="mesh-warm" aria-hidden="true" />

      {/* Soft floating brand glows over the cream */}
      {[
        { x: "14%", y: "20%", size: "w-72 h-72", color: "bg-[#FF0099]", opacity: "opacity-[0.07]", dur: 11, delay: 0 },
        { x: "78%", y: "26%", size: "w-80 h-80", color: "bg-[#FACDE8]", opacity: "opacity-50", dur: 13, delay: 1.5 },
        { x: "60%", y: "74%", size: "w-72 h-72", color: "bg-[#FF7F50]", opacity: "opacity-[0.06]", dur: 12, delay: 1 },
      ].map((b, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          className={`pointer-events-none absolute rounded-full blur-[90px] ${b.size} ${b.color} ${b.opacity}`}
          style={{ left: b.x, top: b.y }}
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
          transition={prefersReducedMotion ? undefined : { duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="mx-auto mb-8 w-fit"
            >
              <Image
                src="/ayms-logo.svg"
                alt="Amigas Y Más Social"
                width={92}
                height={92}
                priority
                className="mx-auto rounded-full shadow-[0_10px_30px_rgb(255_0_153/0.18),0_2px_8px_rgb(34_16_25/0.08)]"
              />
            </motion.div>

            {/* Glass kicker pill */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
              className="pill-glass mx-auto mb-8 flex w-fit items-center gap-2.5 px-4 py-1.5"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF0099] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF0099]" />
              </span>
              <span className="eyebrow text-[#B51760]" style={{ fontSize: "0.68rem" }}>
                Community · Travel · Sisterhood
              </span>
            </motion.div>

            <h1 className="text-editorial font-display text-ink text-balance">
              Come as strangers,
              <br className="hidden sm:block" /> leave as{" "}
              <span className="font-display-italic marker-swipe">amigas</span>
            </h1>

            <p className="text-lead text-ink-soft mx-auto mt-7 max-w-2xl">
              The Latina travel community where sisterhood meets adventure.
              Group trips, local meetups, and lifelong friendships — we&apos;re
              ready to be your new family.
            </p>

            {/* Floating glass stat chips */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.55 }}
              className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-3"
            >
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="glass flex items-baseline gap-1.5 rounded-full px-4 py-1.5"
                >
                  <span className="font-display text-base font-semibold text-ink">{s.value}</span>
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-ink-soft">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "lift group h-14 rounded-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-10 text-base font-semibold tracking-wide text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110",
              )}
            >
              Become an Amiga ♡
            </Link>
            <a
              href="#about"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-14 rounded-full border border-[#221019]/15 bg-transparent px-10 text-base font-semibold text-ink hover:border-[#221019]/25 hover:bg-[#221019]/[0.04]",
              )}
            >
              Learn More
            </a>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.9, duration: 0.8 }}
            className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3"
          >
            {PILLARS.map((item, i) => (
              <motion.div
                key={item.en.label}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : 1.1 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                <FlipCard
                  className="h-48 cursor-pointer rounded-3xl"
                  front={
                    <div className="glass-strong elevate-2 flex h-full flex-col items-center justify-center gap-3 rounded-3xl p-6">
                      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} shadow-[0_6px_18px_rgb(255_0_153/0.22)]`}>
                        <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                      <h3 className="font-display text-lg font-semibold text-ink">{item.en.label}</h3>
                      <p className="text-sm text-ink-soft">{item.en.desc}</p>
                    </div>
                  }
                  back={
                    <div className="glass-strong elevate-3 flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-[#FF0099]/15 p-6">
                      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} shadow-[0_6px_18px_rgb(255_0_153/0.22)]`}>
                        <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                      <h3 className="font-display-italic text-lg text-[#B51760]">{item.es.label}</h3>
                      <p className="text-sm text-ink-soft">{item.es.desc}</p>
                    </div>
                  }
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.a
            href="#about"
            aria-label="Scroll to learn more"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: prefersReducedMotion ? 0 : 1.6 }}
            className="mx-auto mt-16 flex w-fit flex-col items-center gap-2 text-ink-soft transition-colors hover:text-ink"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.3em]">Scroll</span>
            <motion.span
              animate={prefersReducedMotion ? undefined : { y: [0, 6, 0] }}
              transition={prefersReducedMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </motion.span>
          </motion.a>
        </div>
      </div>

      {/* Bottom gradient fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FDFCF7] to-transparent" aria-hidden="true" />
    </section>
  );
}
