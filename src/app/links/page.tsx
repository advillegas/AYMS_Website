"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useLinksPageContent } from "@/lib/use-site-content";
import { getPlatform, resolveContactHref } from "@/lib/social-icons";

const EXT = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Internal routes/anchors render a <Link>; everything else a new-tab <a>. */
function isInternal(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#");
}

export default function LinksPage() {
  const prefersReducedMotion = useReducedMotion();
  const content = useLinksPageContent();

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
              src={content.avatar || "/ayms-logo.svg"}
              alt="Amigas y Más Social logo"
              width={104}
              height={104}
              unoptimized
              priority
              className="h-26 w-26 rounded-full object-cover"
            />
          </span>

          <h1 className="mt-5 font-display text-2xl text-ink sm:text-3xl">
            {content.titleBefore}
            <span className="font-display-italic text-[#FF0099]">{content.titleAccent}</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">{content.handle}</p>
          <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-ink-soft">
            {content.bio}
          </p>
        </motion.header>

        {/* ---------- Social icon row ---------- */}
        {content.socials.length > 0 && (
          <motion.nav
            {...rise(0.06)}
            aria-label="Social links"
            className="mt-6 flex items-center justify-center gap-3"
          >
            {content.socials.map((item) => {
              const plat = getPlatform(item.platform);
              const Icon = plat.Icon;
              // Internal routes/anchors bypass platform resolution so e.g. an
              // Email tile pointing at /#contact isn't turned into a mailto:.
              const href = isInternal(item.href)
                ? item.href
                : resolveContactHref(item.platform, item.href);
              const label = item.label || plat.label;
              const cls =
                "glass-control text-ink size-12 hover:text-[#FF0099] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF0099]/50";
              return isInternal(href) ? (
                <Link key={item.id} href={href} aria-label={label} className={cls}>
                  <Icon className="h-5 w-5" />
                </Link>
              ) : (
                <a
                  key={item.id}
                  href={href}
                  {...EXT}
                  aria-label={`${label} (opens in a new tab)`}
                  className={cls}
                >
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
          </motion.nav>
        )}

        {/* ---------- Tab chips ---------- */}
        {content.chips.length > 0 && (
          <motion.nav
            {...rise(0.12)}
            aria-label="Featured pages"
            className="scrollbar-hide mt-7 flex w-full snap-x gap-2 overflow-x-auto pb-1"
          >
            {content.chips.map((chip) => (
              <a
                key={chip.id}
                href={chip.href}
                {...EXT}
                aria-label={`${chip.label} (opens in a new tab)`}
                className="pill-glass elevate-2 snap-start inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-ink transition-colors hover:text-[#B51760] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#FF0099]/50 focus-visible:ring-offset-2"
              >
                {chip.label}
              </a>
            ))}
          </motion.nav>
        )}

        {/* ---------- Main link buttons ---------- */}
        <div className="mt-7 flex w-full flex-col gap-3.5">
          {content.links.map((link, i) => (
            <motion.a
              key={link.id}
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
        <motion.div {...rise(0.18 + content.links.length * 0.04)} className="mt-10 flex flex-col items-center">
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
