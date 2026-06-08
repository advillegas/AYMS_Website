"use client";

import { useEffect, useState } from "react";
import { useCms } from "@/lib/cms-store";
import { useBuilder, type BuilderElement } from "@/lib/builder-store";
import { ElementRenderer } from "@/components/builder/element-renderer";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { FeaturedSpotlight } from "@/components/landing/featured-spotlight";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { Loader2 } from "lucide-react";

export default function FeaturedPage() {
  const cmsLoad = useCms((s) => s.loadFromStorage);
  const cmsPage = useCms((s) => s.pages["featured"]);
  const builderPublished = useBuilder((s) => s.publishedElements);
  const builderLoad = useBuilder((s) => s.loadFromStorage);

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
          <FeaturedSpotlight />
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
