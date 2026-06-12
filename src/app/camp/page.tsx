"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import {
  MapPin,
  Calendar,
  Users,
  Check,
  Star,
  Flame,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";

const CHECKOUT_FULL = "https://buy.stripe.com/cNi7sM4nsdRp2Ga6s88IU0C";
const CHECKOUT_SPLIT = "https://buy.stripe.com/aFa14o2fkcNl1C6g2I8IU0F";

const FACTS = [
  { icon: MapPin, label: "San Bernardino County, CA" },
  { icon: Calendar, label: "August 28–30, 2026" },
  { icon: Users, label: "Latina Women ~21+" },
];

const FEATURES = [
  {
    icon: "/camp/icon-nostalgia.png",
    en: {
      title: "Camp Nostalgia",
      desc: "Cabins, bunk beds, ice breakers, and classic camp vibes — re-imagined for Latinas.",
    },
    es: {
      title: "Nostalgia de Campamento",
      desc: "Cabañas, literas, dinámicas para romper el hielo y el clásico ambiente de campamento — reimaginado para Latinas.",
    },
    gradientBack: "from-[#FF0099] to-[#B51760]",
  },
  {
    icon: "/camp/icon-play.png",
    en: {
      title: "Play, Laughter, Fun",
      desc: "Group games, pool time, movie nights, and carefree moments that feel like true sisterhood.",
    },
    es: {
      title: "Juego, Risas, Diversión",
      desc: "Juegos en grupo, piscina, noches de película y momentos sin preocupaciones que se sienten como verdadera hermandad.",
    },
    gradientBack: "from-[#FF7F50] to-[#FF0099]",
  },
  {
    icon: "/camp/icon-connection.png",
    en: {
      title: "Connection & Reflection",
      desc: "Intentional connections and space to reconnect with yourself and other Latinas.",
    },
    es: {
      title: "Conexión y Reflexión",
      desc: "Conexiones intencionales y espacio para reconectar contigo misma y con otras Latinas.",
    },
    gradientBack: "from-[#9B2C8A] to-[#FF0099]",
  },
  {
    icon: "/camp/icon-community.png",
    en: {
      title: "True Community",
      desc: "You'll arrive solo but you won't leave alone. These are amigas that extend beyond the weekend.",
    },
    es: {
      title: "Comunidad Verdadera",
      desc: "Llegarás sola pero no te irás sola. Son amigas que trascienden el fin de semana.",
    },
    gradientBack: "from-[#B51760] to-[#FF7F50]",
  },
];

const INCLUSIONS = [
  "2-night stay, bunk-bed style",
  "All meals",
  "Open bar",
  "All activities",
  "Camp Counselors",
  "Surprise Gift",
];

const ACTIVITIES = [
  "Campfire and S'mores",
  "Movie Night",
  "Sound bath",
  "Pool Party",
  "Zip Lining",
  "Bonding activity",
  "Morning yoga",
  "Special guest moments",
];

const TESTIMONIALS = [
  {
    name: "Yessica",
    location: "California",
    quote:
      "I love how we arrive to our destination knowing little about one another and leave as long lasting amigas.",
  },
  {
    name: "Alejandra",
    location: "Texas",
    quote:
      "Sharing these experiences with people who look and sound like you lets us skip the \u201cgetting to know you\u201d phase and dive right into meaningful connections. It's powerful to explore how our shared experiences, especially as Latinas, shape us as we travel the world.",
  },
  {
    name: "Christina",
    location: "California",
    quote:
      "We have empowering conversations, and I get to build relationships with total strangers that otherwise I wouldn't have met. It's very easy to make friends since we can relate at some level from our cultural experience.",
  },
];

const ABOUT_PHOTOS = [
  "/camp/about-1.jpg",
  "/camp/about-2.jpg",
  "/camp/about-3.png",
  "/camp/about-4.png",
];

const CTA_PHOTOS = ["/camp/cta-1.png", "/camp/cta-2.png", "/camp/cta-3.png", "/camp/cta-4.png"];

function CheckoutButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <a
        href={CHECKOUT_FULL}
        target="_blank"
        rel="noopener noreferrer"
        className="lift inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-8 py-3 text-base font-semibold text-white shadow-[0_8px_24px_rgb(255_0_153/0.3)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF7]"
      >
        Save Your Spot
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={CHECKOUT_SPLIT}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#FF0099]/30 bg-white px-8 py-3 text-base font-semibold text-[#B51760] transition-colors hover:bg-[#FF0099]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/40"
      >
        Pay in 2
      </a>
    </div>
  );
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function CampPage() {
  const reduceMotion = useReducedMotion();
  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  };

  return (
    <CmsPageWrapper slug="camp">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero — centered, with a large photo showcase beneath */}
        <section className="canvas-editorial grain relative overflow-hidden pb-14 pt-6 sm:pb-16 sm:pt-8">
          <div className="mesh-warm" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <motion.div
              initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="mx-auto mb-4 w-24 sm:w-28"
            >
              <Image
                src="/camp/hero-graphic.png"
                alt="Amigas Summer Camp"
                width={300}
                height={300}
                priority
                unoptimized
                className="mx-auto h-auto w-full drop-shadow-[0_8px_24px_rgb(255_0_153/0.18)]"
              />
            </motion.div>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pill-glass mx-auto mb-6 flex w-fit items-center gap-2.5 px-4 py-1.5">
                <Flame className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
                <span className="eyebrow text-[#B51760]">All-Inclusive · Aug 28–30, 2026</span>
              </div>
              <h1 className="text-editorial font-display text-ink text-balance">
                Relive Summer Camp —{" "}
                <span className="font-display-italic marker-swipe text-[#B51760]">
                  but make it Amigas
                </span>
              </h1>
              <p className="text-lead font-[family-name:var(--font-sans)] mx-auto mt-6 max-w-2xl text-ink-soft">
                An <strong className="font-semibold text-ink">all-inclusive</strong> nostalgic
                weekend designed for Latina women craving connection, laughter, and the kind of
                friendships that feel like home.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                {FACTS.map((f) => (
                  <span key={f.label} className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                    <f.icon className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
                    {f.label}
                  </span>
                ))}
              </div>
              <CheckoutButtons className="mt-9 items-center justify-center" />
            </motion.div>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mt-14 max-w-5xl px-4 sm:px-6 lg:px-8"
          >
            <div className="relative h-[400px] w-full overflow-hidden rounded-[2rem] elevate-4 ring-1 ring-white/60 sm:h-[500px]">
              <Image
                src="/camp/hero-photo.jpg"
                alt="Amigas laughing together at Summer Camp"
                fill
                priority
                unoptimized
                sizes="(max-width: 1280px) 92vw, 1024px"
                className="object-cover object-center"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#221019]/20 via-transparent to-transparent" aria-hidden="true" />
            </div>
          </motion.div>
        </section>

        {/* What is Amigas Summer Camp */}
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
              <p className="mt-5 text-lead text-ink-soft">
                Amigas Summer Camp is a grown-girl reimagining of the summer camp experience —
                designed for Latina women who want to unplug, reconnect, and build real friendships
                in a joyful, supportive space.
              </p>
              <p className="mt-4 font-display text-lg text-ink">
                This isn&apos;t a retreat where you sit quietly all day.
              </p>
              <ul className="mt-4 space-y-2.5">
                {[
                  "It's laughter around a cozy fire.",
                  "Late-night talks about family traditions.",
                  "Inside jokes that turn into lifelong bonds.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-ink-soft">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF0099]/10 text-[#FF0099]">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    {line}
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
                  <Image src={src} alt="" fill unoptimized sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Feature cards — flip to Spanish, over the pink bokeh background */}
        <section className="relative overflow-hidden py-20 sm:py-24">
          <Image
            src="/camp/texture.webp"
            alt=""
            fill
            unoptimized
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-white/25" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.p {...reveal} className="eyebrow mb-8 text-center text-[#B51760]">
              Hover or tap to flip · Pasa el cursor o toca para voltear
            </motion.p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.en.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.08, ease: EASE }}
                >
                  <FlipCard
                    className="h-64 cursor-pointer rounded-2xl"
                    front={
                      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-[#221019]/8 bg-white p-7 text-center elevate-2">
                        <div className="mb-4 h-16 w-16">
                          <Image src={f.icon} alt="" width={64} height={64} unoptimized className="h-full w-full object-contain" />
                        </div>
                        <h3 className="font-display text-lg text-ink">{f.en.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.en.desc}</p>
                      </div>
                    }
                    back={
                      <div className={`flex h-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradientBack} p-7 text-center text-white`}>
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 p-2.5">
                          <Image src={f.icon} alt="" width={48} height={48} unoptimized className="h-full w-full object-contain" />
                        </div>
                        <h3 className="font-display text-lg">{f.es.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/90">{f.es.desc}</p>
                      </div>
                    }
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery band */}
        <section className="canvas-warm grain relative overflow-hidden border-y border-[#FF7F50]/15 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <motion.h2 {...reveal} className="text-title font-display text-ink">
              Sunshine. Adventure.{" "}
              <span className="font-display-italic marker-swipe text-[#B51760]">Amigas.</span>
            </motion.h2>
            <motion.div {...reveal} className="mt-10 grid gap-5 sm:grid-cols-2">
              {["/camp/gallery-1.jpg", "/camp/gallery-2.jpg"].map((src) => (
                <div key={src} className="relative aspect-[16/9] overflow-hidden rounded-3xl elevate-2">
                  <Image src={src} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Inclusions + Activities */}
        <section className="canvas-editorial relative py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <motion.div {...reveal}>
              <p className="eyebrow text-[#FF7F50] mb-3">Here&apos;s What You Get</p>
              <h2 className="text-title font-display text-ink">
                Camp{" "}
                <span className="font-display-italic marker-swipe text-[#B51760]">Inclusions</span>
              </h2>
              <ul className="mt-7 space-y-3">
                {INCLUSIONS.map((item) => (
                  <li
                    key={item}
                    className="lift flex items-center gap-3 rounded-2xl border border-[#221019]/8 bg-white px-5 py-3.5 elevate-2"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7F50]/20 to-[#FF0099]/10 text-[#FF7F50]">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="font-medium text-ink">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div {...reveal}>
              <p className="eyebrow text-[#FF7F50] mb-3">The Lineup</p>
              <h2 className="text-title font-display text-ink">
                <span className="font-display-italic marker-swipe text-[#B51760]">Activities</span>
              </h2>
              <div className="mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {ACTIVITIES.map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-ink-soft">
                    <Sparkles className="h-4 w-4 shrink-0 text-[#FF0099]" aria-hidden="true" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <div className="relative mt-8 aspect-[683/1024] w-full max-w-sm overflow-hidden rounded-3xl elevate-2">
                <Image
                  src="/camp/activities.png"
                  alt="Amigas Summer Camp activities"
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 384px"
                  className="object-cover"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="canvas-warm relative overflow-hidden border-t border-[#FF7F50]/15 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <motion.h2 {...reveal} className="text-title font-display text-ink mx-auto max-w-2xl">
              What the amigas say about our{" "}
              <span className="font-display-italic marker-swipe text-[#B51760]">community…</span>
            </motion.h2>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <motion.figure
                  key={t.name}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="flex h-full flex-col rounded-2xl border border-[#221019]/8 bg-white p-7 text-left elevate-2"
                >
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-4 w-4 fill-[#FF7F50] text-[#FF7F50]" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="flex-1 text-ink-soft leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5">
                    <span className="block font-display text-ink">{t.name}</span>
                    <span className="text-xs text-ink-soft">{t.location}</span>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="canvas-editorial grain relative overflow-hidden py-24">
          <div className="mesh-warm" />
          <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <motion.div {...reveal}>
              <h2 className="text-title font-display text-ink">
                Enough already.{" "}
                <span className="font-display-italic marker-swipe text-[#B51760]">SIGN ME UP!</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lead text-ink-soft">
                Spots are limited and these weekends fill fast. Lock in your bunk and we&apos;ll
                handle the rest.
              </p>
              <CheckoutButtons className="mt-8 items-center justify-center" />
            </motion.div>
            <motion.div {...reveal} className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {CTA_PHOTOS.map((src) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded-2xl elevate-2">
                  <Image src={src} alt="" fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
