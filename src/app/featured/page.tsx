"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useCms } from "@/lib/cms-store";
import { useBuilder, type BuilderElement } from "@/lib/builder-store";
import { ElementRenderer } from "@/components/builder/element-renderer";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FeaturedPage() {
  const cmsLoad = useCms((s) => s.loadFromStorage);
  const cmsPage = useCms((s) => s.pages["featured"]);
  const builderPublished = useBuilder((s) => s.publishedElements);
  const builderLoad = useBuilder((s) => s.loadFromStorage);
  const reduceMotion = useReducedMotion();

  // Both stores hydrate from localStorage on the client, so which branch we
  // render depends on client-only state. Hold a neutral placeholder until
  // mounted so the first client render matches the server HTML.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    cmsLoad();
    builderLoad();
    setMounted(true);
  }, [cmsLoad, builderLoad]);

  const elements = (cmsPage?.isPublished && cmsPage.elements.length > 0)
    ? cmsPage.elements
    : builderPublished;

  if (!mounted) {
    return (
      <CmsPageWrapper slug="featured">
        <Navbar />
        <main className="min-h-screen pt-[88px]">
          <section className="grain relative overflow-hidden bg-[#1a0a12] py-40">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] via-[#1a0a12] to-[#1A0814]" />
            <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center" aria-busy="true" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-[#FFB3D0]" aria-hidden="true" />
              <p className="mt-4 text-sm text-white/40">Loading…</p>
              <span className="sr-only">Loading featured content</span>
            </div>
          </section>
        </main>
        <Footer />
      </CmsPageWrapper>
    );
  }

  return (
    <CmsPageWrapper slug="featured">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {elements.length === 0 ? (
          <section className="grain relative overflow-hidden bg-[#1a0a12] py-40">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] via-[#1a0a12] to-[#1A0814]" />
            <div className="aurora opacity-50" />
            <div className="absolute inset-0 pattern-dots opacity-[0.07]" />
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto max-w-3xl px-4 text-center"
            >
              <motion.div
                initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-[0_0_40px_rgb(255_0_153/0.25)]"
              >
                <Sparkles className="h-10 w-10 text-[#FFB3D0]" aria-hidden="true" />
              </motion.div>
              <div className="mx-auto mb-7 flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 backdrop-blur-md">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className={cn("absolute inline-flex h-full w-full rounded-full bg-[#FF0099] opacity-75", !reduceMotion && "animate-ping")} />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF0099]" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#FFB3D0]">
                  Coming Soon
                </span>
              </div>
              <h1 className="text-hero font-[family-name:var(--font-heading)] font-extrabold text-white text-balance">
                Featured{" "}
                <span className="text-gradient-brand">Event</span>
              </h1>
              <p className="text-lead mx-auto mt-6 max-w-lg text-white/70">
                Stay tuned — something exciting is on the way!
              </p>
            </motion.div>
          </section>
        ) : (
          <section className="grain relative overflow-hidden bg-[#1A0814]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A]/60 to-[#1A0814]" />
            <div className="aurora opacity-40" />
            <div className="absolute inset-0 pattern-dots opacity-[0.06]" />
            <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="space-y-6">
                {elements.map((el: BuilderElement) => (
                  <ElementRenderer key={el.id} element={el} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
