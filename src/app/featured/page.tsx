"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useCms } from "@/lib/cms-store";
import { useBuilder, type BuilderElement } from "@/lib/builder-store";
import { ElementRenderer } from "@/components/builder/element-renderer";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { FeaturedSpotlight } from "@/components/landing/featured-spotlight";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { Loader2, Sparkles } from "lucide-react";

export default function FeaturedPage() {
  const cmsPage = useCms((s) => s.pages["featured"]);
  const builderPublished = useBuilder((s) => s.publishedElements);
  const builderLoad = useBuilder((s) => s.loadFromStorage);
  const reduceMotion = useReducedMotion();

  // The CMS "featured" page hydrates from Firestore via CmsPageWrapper's
  // realtime subscription (shared across all visitors). The builder-store
  // publishedElements fallback is still a localStorage seed, so hydrate that
  // one here. Hold a neutral placeholder until mounted so the first client
  // render matches the server HTML.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    builderLoad();
    setMounted(true);
  }, [builderLoad]);

  const elements = (cmsPage?.isPublished && cmsPage.elements.length > 0)
    ? cmsPage.elements
    : builderPublished;

  if (!mounted) {
    return (
      <CmsPageWrapper slug="featured">
        <Navbar />
        <main className="canvas-editorial min-h-screen pt-[88px]">
          <section className="grain relative overflow-hidden canvas-editorial py-40">
            <div className="mesh-warm" />
            <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center" aria-busy="true" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-[#B51760]" aria-hidden="true" />
              <p className="mt-4 text-sm text-ink-soft">Loading…</p>
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
      <main className="canvas-editorial min-h-screen pt-[88px]">
        {elements.length === 0 ? (
          <FeaturedSpotlight />
        ) : (
          <>
            {/* Editorial-luxe header above published CMS/builder content */}
            <section className="grain relative overflow-hidden canvas-editorial py-24">
              <div className="mesh-warm" />
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"
              >
                <div className="pill-glass mx-auto mb-6 flex w-fit items-center gap-2 px-4 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#B51760]" aria-hidden="true" />
                  <span className="eyebrow text-[#B51760]">Featured Spotlight</span>
                </div>
                <h1 className="text-hero font-display text-ink text-balance">
                  Your Next{" "}
                  <span className="font-display-italic marker-swipe text-[#B51760]">
                    Adventure
                  </span>
                </h1>
                <p className="text-lead mx-auto mt-5 max-w-lg text-ink-soft">
                  The trip everyone&apos;s talking about — grab your spot before
                  it&apos;s gone.
                </p>
              </motion.div>
            </section>

            {/* Published content — rendered on a glass editorial card */}
            <section className="relative overflow-hidden canvas-warm py-16">
              <div className="mesh-warm opacity-60" />
              <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="glass-strong elevate-3 rounded-3xl p-6 sm:p-10">
                  <div className="space-y-6">
                    {elements.map((el: BuilderElement) => (
                      <ElementRenderer key={el.id} element={el} />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
