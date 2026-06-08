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
    bg: "from-[#FF0099] to-[#C2266A]",
    bgBack: "from-[#B51760] to-[#8B1A5A]",
  },
  {
    icon: Users,
    en: { label: "Empower", desc: "Grow together as a community" },
    es: { label: "Empoderar", desc: "Crecer juntas como comunidad" },
    bg: "from-[#B51760] to-[#9B2C8A]",
    bgBack: "from-[#8B1A5A] to-[#FF0099]",
  },
  {
    icon: Sparkles,
    en: { label: "Celebrate", desc: "Travel and create memories" },
    es: { label: "Celebrar", desc: "Viajar y crear recuerdos" },
    bg: "from-[#C44B3F] to-[#FF0099]",
    bgBack: "from-[#DAA520] to-[#FF0099]",
  },
];

const DESTINATIONS = ["Cancún", "Bali", "Morocco", "Cartagena", "Sahara", "Safari"];

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section
      id="home"
      className="grain relative min-h-screen overflow-hidden bg-[#1a0a12]"
    >
      {/* Deep layered base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] via-[#150a10] to-[#1A0814]" />

      {/* Animated aurora mesh — brand color clouds */}
      <div className="aurora opacity-70" />

      {/* Soft bokeh lights */}
      {[
        { x: "15%", y: "22%", size: "w-44 h-44", color: "bg-[#B51760]", opacity: "opacity-[0.05]", dur: 9, delay: 0 },
        { x: "72%", y: "18%", size: "w-52 h-52", color: "bg-[#C8A050]", opacity: "opacity-[0.04]", dur: 11, delay: 2 },
        { x: "55%", y: "68%", size: "w-48 h-48", color: "bg-[#B8306A]", opacity: "opacity-[0.045]", dur: 10, delay: 1 },
      ].map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[80px] ${b.size} ${b.color} ${b.opacity}`}
          style={{ left: b.x, top: b.y }}
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={prefersReducedMotion ? undefined : { duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
        />
      ))}

      {/* Sparse twinkling stars */}
      {[
        { x: "12%", y: "28%", dur: 4, delay: 0 },
        { x: "85%", y: "20%", dur: 5, delay: 1.5 },
        { x: "25%", y: "70%", dur: 4.5, delay: 0.8 },
        { x: "70%", y: "65%", dur: 5.5, delay: 2.5 },
        { x: "48%", y: "15%", dur: 3.5, delay: 3 },
      ].map((s, i) => (
        <motion.div
          key={`s${i}`}
          className="absolute h-0.5 w-0.5 rounded-full bg-white/50"
          style={{ left: s.x, top: s.y }}
          animate={prefersReducedMotion ? undefined : { opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
          transition={prefersReducedMotion ? undefined : { duration: s.dur, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
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
                width={104}
                height={104}
                priority
                className="mx-auto rounded-full shadow-[0_0_36px_rgb(255_0_153/0.30),0_0_72px_rgb(181_23_96/0.12)]"
              />
            </motion.div>

            {/* Glass kicker pill */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
              className="mx-auto mb-7 flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF0099] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF0099]" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#FFB3D0]">
                Community · Travel · Sisterhood
              </span>
            </motion.div>

            <h1 className="text-display font-[family-name:var(--font-heading)] font-extrabold text-white text-balance">
              Home of Your{" "}
              <span className="text-gradient-brand">New Amigas</span>
            </h1>

            <p className="text-lead mx-auto mt-7 max-w-2xl text-white/65">
              The Latina travel community where sisterhood meets adventure.
              Group trips, local meetups, and lifelong friendships — we&apos;re
              ready to be your new family.
            </p>

            {/* Real-destination chips */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.55 }}
              className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-center gap-2"
            >
              {DESTINATIONS.map((d) => (
                <span
                  key={d}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1 text-xs font-medium text-white/70 backdrop-blur-sm"
                >
                  {d}
                </span>
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
                "lift group h-14 rounded-full border-0 bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] px-10 text-base font-semibold tracking-wide text-white shadow-[0_8px_30px_rgb(255_0_153/0.35)] hover:brightness-110",
              )}
            >
              Become an Amiga ♡
            </Link>
            <a
              href="#about"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-14 rounded-full border-white/20 bg-white/5 px-10 text-base font-semibold text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/10",
              )}
            >
              Learn More
            </a>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.9, duration: 0.8 }}
            className="mx-auto mt-20 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3"
          >
            {PILLARS.map((item, i) => (
              <motion.div
                key={item.en.label}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : 1.1 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                <FlipCard
                  className="ring-gradient h-48 cursor-pointer rounded-3xl"
                  front={
                    <div className={`flex h-full flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br ${item.bg} p-6 shadow-lg shadow-black/30`}>
                      <item.icon className="h-9 w-9 text-white/90" aria-hidden="true" />
                      <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-white">{item.en.label}</h3>
                      <p className="text-sm text-white/75">{item.en.desc}</p>
                    </div>
                  }
                  back={
                    <div className={`flex h-full flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br ${item.bgBack} p-6 shadow-lg shadow-black/30`}>
                      <item.icon className="h-9 w-9 text-white/90" aria-hidden="true" />
                      <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-white">{item.es.label}</h3>
                      <p className="text-sm text-white/75">{item.es.desc}</p>
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
            className="mx-auto mt-16 flex w-fit flex-col items-center gap-2 text-white/65 transition-colors hover:text-white/70"
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
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
