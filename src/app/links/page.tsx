"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/* Brand glyphs absent from lucide-react — inline SVGs, matching the   */
/* pattern used in src/components/landing/footer.tsx (InstagramIcon).  */
/* ------------------------------------------------------------------ */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.5 3c.3 2.1 1.6 3.8 3.5 4.3v3.1c-1.3.1-2.6-.2-3.7-.9v6.2a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3.2a2.6 2.6 0 1 0 1.8 2.5V3h3.2z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Data — rendered from arrays, never hand-repeated markup.            */
/* ------------------------------------------------------------------ */
type Social = {
  label: string;
  href: string;
  Icon: ({ className }: { className?: string }) => React.ReactElement;
  external: boolean;
};

const SOCIALS: Social[] = [
  // The Beacons "email" entry maps to our own contact surface. No /contact
  // route exists (verified src/app), so we use the homepage #contact anchor.
  { label: "Email", href: "/#contact", Icon: ({ className }) => <Mail className={className} aria-hidden="true" />, external: false },
  { label: "TikTok", href: "https://tiktok.com/@amigasymassocial", Icon: TikTokIcon, external: true },
  { label: "Instagram", href: "https://instagram.com/amigasymassocial", Icon: InstagramIcon, external: true },
];

type Chip = { label: string; href: string };

const CHIPS: Chip[] = [
  { label: "Home", href: "https://beacons.ai/amigasymassocial/home" },
  { label: "AYMS Mardi Gras 2027", href: "https://beacons.ai/amigasymassocial/aymsmardigras2027" },
  { label: "Amigas en Boston", href: "https://beacons.ai/amigasymassocial/amigasenboston" },
  { label: "Amigas in Jamaica", href: "https://beacons.ai/amigasymassocial/amigasinjamaica" },
  { label: "Amigas in Australia", href: "https://beacons.ai/amigasymassocial/amigasinaustralia" },
];

type LinkButton = { label: string; href: string; emoji: string };

const LINKS: LinkButton[] = [
  { emoji: "🌸", label: "NOMINATE AN AMIGA: AMIGAS SUMMER CAMP.", href: "https://docs.google.com/forms/d/e/1FAIpQLSem5H6ihrzrcYir9KNHOwdlEBmJXKUhJx3keGhKb690XWgdtA/viewform?usp=sharing&ouid=114693344536179256373" },
  { emoji: "☀️", label: "Amigas Summer Camp", href: "https://amigasymassocial.com/summer-camp/" },
  { emoji: "🇮🇹", label: "Amigas Y Mas takes on Italy- Rome to Sorrento!", href: "https://amigasymas.trutravels.com/join-the-amigas/8-day-slice-of-italy-tour" },
  { emoji: "🇬🇷", label: "9 Day Greece Island Hopper - Join Amigas Y Mas for a Euro Summer Island Hopping Greece!", href: "https://amigasymas.trutravels.com/girls-trip/greece-island-hopper#" },
  { emoji: "🪔", label: "India and Holi Fest with Amigas y Más Social", href: "https://trovatrip.com/trip/asia/india/india-with-sally-romero-mar-2027" },
  { emoji: "🇲🇦", label: "Join the Amigas in Morocco!", href: "https://amigasymas.trutravels.com/9-day-morocco-uncovered#_included" },
  { emoji: "🇧🇷", label: "Join las amigas in Brazil!", href: "https://amigasymas.trutravels.com/join-the-amigas/6-day-rio-carnival#_included" },
  { emoji: "🥂", label: "RSVP to Ponte Las Pilates & Brunch | Partiful", href: "https://partiful.com/e/q247Iyihymdlc7Q1wznR?c=tHrubA1O" },
  { emoji: "💖", label: "Become a member of Amigas y Mas Social", href: "https://whop.com/amigas-y-mas-social/" },
];

const EXT = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function LinksPage() {
  const prefersReducedMotion = useReducedMotion();

  // Client component can't export `metadata`; set the document title directly.
  useEffect(() => {
    const prev = document.title;
    document.title = "Amigas y Más Social — Links";
    return () => {
      document.title = prev;
    };
  }, []);

  const rise = (delay: number) => ({
    initial: prefersReducedMotion ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: prefersReducedMotion ? 0 : delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <main className="canvas-editorial grain relative min-h-dvh overflow-hidden">
      {/* Warm radial mesh backdrop (reduced-motion handled in globals.css) */}
      <div className="mesh-warm" aria-hidden="true" />

      <div className="relative mx-auto flex w-full max-w-md flex-col items-center px-5 pb-16 pt-12 sm:pt-16">
        {/* ---------- Header / avatar ---------- */}
        <motion.header {...rise(0)} className="flex flex-col items-center text-center">
          <span className="ring-gradient elevate-2 inline-flex rounded-full">
            <Image
              src="/ayms-logo.svg"
              alt="Amigas y Más Social logo"
              width={104}
              height={104}
              unoptimized
              priority
              className="h-26 w-26 rounded-full"
            />
          </span>

          <h1 className="mt-5 font-display text-2xl text-ink sm:text-3xl">
            Amigas y Más <span className="font-display-italic text-[#FF0099]">Social</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">@amigasymassocial</p>
          <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-ink-soft">
            La comunidad de viajes para Latinas — group trips, summer camp &amp; events que se sienten como home. ♡
          </p>
        </motion.header>

        {/* ---------- Social icon row ---------- */}
        <motion.nav
          {...rise(0.06)}
          aria-label="Social links"
          className="mt-6 flex items-center justify-center gap-3"
        >
          {SOCIALS.map(({ label, href, Icon, external }) =>
            external ? (
              <a
                key={label}
                href={href}
                {...EXT}
                aria-label={`${label} (opens in a new tab)`}
                className="glass-control text-ink size-12 hover:text-[#FF0099] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF0099]/50"
              >
                <Icon className="h-5 w-5" />
              </a>
            ) : (
              <Link
                key={label}
                href={href}
                aria-label={`${label} — contact us`}
                className="glass-control text-ink size-12 hover:text-[#FF0099] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF0099]/50"
              >
                <Icon className="h-5 w-5" />
              </Link>
            )
          )}
        </motion.nav>

        {/* ---------- Tab chips ---------- */}
        <motion.nav
          {...rise(0.12)}
          aria-label="Featured pages"
          className="scrollbar-hide mt-7 flex w-full snap-x gap-2 overflow-x-auto pb-1"
        >
          {CHIPS.map((chip) => (
            <a
              key={chip.label}
              href={chip.href}
              {...EXT}
              aria-label={`${chip.label} (opens in a new tab)`}
              className="pill-glass elevate-2 snap-start inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-ink transition-colors hover:text-[#B51760] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF0099]/50 focus-visible:ring-offset-2"
            >
              {chip.label}
            </a>
          ))}
        </motion.nav>

        {/* ---------- Main link buttons ---------- */}
        <div className="mt-7 flex w-full flex-col gap-3.5">
          {LINKS.map((link, i) => (
            <motion.a
              key={link.href}
              {...rise(0.18 + i * 0.04)}
              href={link.href}
              {...EXT}
              aria-label={`${link.label} (opens in a new tab)`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "glass-strong lift elevate-2 group/link h-14 w-full justify-start gap-3 rounded-2xl px-4",
                "text-ink hover:bg-transparent hover:text-[#B51760] dark:bg-transparent",
                "focus-visible:ring-[#FF0099]/50 focus-visible:border-[#FF0099]"
              )}
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-[#FF0099]/10 text-lg"
                aria-hidden="true"
              >
                {link.emoji}
              </span>
              <span className="min-w-0 flex-1 whitespace-normal text-left text-[0.9rem] font-semibold leading-snug">
                {link.label}
              </span>
              <ArrowUpRight
                className="size-4 shrink-0 text-[#FF0099] transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                aria-hidden="true"
              />
            </motion.a>
          ))}
        </div>

        {/* ---------- Footer wordmark ---------- */}
        <motion.div {...rise(0.18 + LINKS.length * 0.04)} className="mt-10 flex flex-col items-center">
          <Image
            src="/ayms-wordmark.png"
            alt="Amigas y Más Social"
            width={146}
            height={106}
            unoptimized
            className="h-auto w-28 opacity-70"
          />
          <p className="eyebrow mt-3 text-[#B51760]/70">Amigas y Más Social</p>
        </motion.div>
      </div>
    </main>
  );
}
