"use client";

import { useEffect } from "react";
import { useCms } from "@/lib/cms-store";
import { useBuilder, type BuilderElement } from "@/lib/builder-store";
import { ElementRenderer } from "@/components/builder/element-renderer";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { Sparkles } from "lucide-react";

export default function FeaturedPage() {
  const cmsLoad = useCms((s) => s.loadFromStorage);
  const cmsPage = useCms((s) => s.pages["featured"]);
  const builderPublished = useBuilder((s) => s.publishedElements);
  const builderLoad = useBuilder((s) => s.loadFromStorage);

  useEffect(() => {
    cmsLoad();
    builderLoad();
  }, [cmsLoad, builderLoad]);

  const elements = (cmsPage?.isPublished && cmsPage.elements.length > 0)
    ? cmsPage.elements
    : builderPublished;

  return (
    <CmsPageWrapper slug="featured">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {elements.length === 0 ? (
          <section className="relative overflow-hidden bg-[#1a0a12] py-32">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] to-[#1A0814]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,oklch(0.40_0.14_340/0.15),transparent)]" />
            <div className="relative mx-auto max-w-3xl px-4 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-[#FFB3D0]/40 mb-4" />
              <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-white sm:text-4xl">
                Featured Event Coming Soon
              </h1>
              <p className="mt-4 text-white/40">
                Stay tuned — something exciting is on the way!
              </p>
            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden bg-[#1A0814]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A]/50 to-[#1A0814]" />
            <div className="absolute inset-0 pattern-dots opacity-5" />
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
