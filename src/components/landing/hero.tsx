"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart, Users, Sparkles } from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";

const PILLARS = [
  {
    icon: Heart,
    en: { label: "Connect", desc: "Build lifelong friendships" },
    es: { label: "Conectar", desc: "Construye amistades para toda la vida" },
    color: "text-white",
    bg: "from-[#E8458B] to-[#C2266A]",
    bgBack: "from-[#D4357A] to-[#8B1A5A]",
  },
  {
    icon: Users,
    en: { label: "Empower", desc: "Grow together as a community" },
    es: { label: "Empoderar", desc: "Crecer juntas como comunidad" },
    color: "text-white",
    bg: "from-[#D4357A] to-[#9B2C8A]",
    bgBack: "from-[#8B1A5A] to-[#E8458B]",
  },
  {
    icon: Sparkles,
    en: { label: "Celebrate", desc: "Travel and create memories" },
    es: { label: "Celebrar", desc: "Viajar y crear recuerdos" },
    color: "text-white",
    bg: "from-[#C44B3F] to-[#E8458B]",
    bgBack: "from-[#DAA520] to-[#E8458B]",
  },
];

export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden bg-[#1a0a12]"
    >
      {/* Deep rich layered background — refined, not overpowering */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1f0d16] via-[#150a10] to-[#0d060a]" />

      {/* Gentle ambient warmth — subtler, more elegant */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_20%_30%,oklch(0.40_0.12_350/0.18),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_25%,oklch(0.45_0.14_340/0.14),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_50%_75%,oklch(0.38_0.10_20/0.12),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_50%,oklch(0.42_0.08_60/0.06),transparent_45%)]" />

      {/* Subtle noise/grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />

      {/* Soft bokeh lights — restrained, warm */}
      {[
        { x: "15%", y: "22%", size: "w-44 h-44", color: "bg-[#D4357A]", opacity: "opacity-[0.04]", dur: 9, delay: 0 },
        { x: "72%", y: "18%", size: "w-52 h-52", color: "bg-[#C8A050]", opacity: "opacity-[0.03]", dur: 11, delay: 2 },
        { x: "55%", y: "68%", size: "w-48 h-48", color: "bg-[#B8306A]", opacity: "opacity-[0.035]", dur: 10, delay: 1 },
      ].map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[80px] ${b.size} ${b.color} ${b.opacity}`}
          style={{ left: b.x, top: b.y }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
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
          animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: s.dur, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="mx-auto mb-8"
            >
              <Image
                src="/ayms-logo.svg"
                alt="Amigas Y Más Social"
                width={110}
                height={110}
                className="mx-auto rounded-full shadow-[0_0_30px_oklch(0.60_0.24_340/0.25),0_0_60px_oklch(0.55_0.27_330/0.10)]"
              />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-5 text-sm font-bold uppercase tracking-[0.35em] text-[#FFB3D0]"
            >
              Community · Travel · Sisterhood
            </motion.p>

            <h1 className="font-[family-name:var(--font-heading)] text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-8xl">
              Home of Your
              <br />
              <span className="bg-gradient-to-r from-[#FFB3D0] via-[#E8458B] to-[#D4A56A] bg-clip-text text-transparent">
                New Amigas
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg text-white/60 sm:text-xl leading-relaxed">
              Join our Latina community for connection, fun, and empowerment.
              We&apos;re ready to be your new family.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "text-base px-10 h-13 bg-gradient-to-r from-[#E8458B] via-[#D4357A] to-[#E8458B] text-white border-0 hover:brightness-110 shadow-[0_0_20px_oklch(0.60_0.24_340/0.20)] animate-shimmer font-semibold tracking-wide",
              )}
            >
              Become an Amiga ♡
            </Link>
            <a
              href="#about"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "text-base px-10 h-13 border-white/20 text-white hover:bg-white/10 hover:border-white/40 font-semibold bg-white/5 backdrop-blur-sm",
              )}
            >
              Learn More
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mx-auto mt-20 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3"
          >
            {PILLARS.map((item, i) => (
              <motion.div
                key={item.en.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + i * 0.15 }}
              >
                <FlipCard
                  className="h-44 cursor-pointer"
                  front={
                    <div className={`flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br ${item.bg} p-6 shadow-lg shadow-black/30 border border-white/10 backdrop-blur-sm`}>
                      <item.icon className="h-9 w-9 text-white/90" />
                      <h3 className="text-lg font-bold font-[family-name:var(--font-heading)] text-white">{item.en.label}</h3>
                      <p className="text-sm text-white/70">{item.en.desc}</p>
                    </div>
                  }
                  back={
                    <div className={`flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br ${item.bgBack} p-6 shadow-lg shadow-black/30 border border-white/15`}>
                      <item.icon className="h-9 w-9 text-white/90" />
                      <h3 className="text-lg font-bold font-[family-name:var(--font-heading)] text-white">{item.es.label}</h3>
                      <p className="text-sm text-white/70">{item.es.desc}</p>
                    </div>
                  }
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
