"use client";

import { useEffect } from "react";
import { useBuilder, type BuilderElement } from "@/lib/builder-store";
import { ElementRenderer } from "@/components/builder/element-renderer";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Sparkles } from "lucide-react";

export default function FeaturedPage() {
  const publishedElements = useBuilder((s) => s.publishedElements);
  const loadFromStorage = useBuilder((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {publishedElements.length === 0 ? (
          <section className="relative overflow-hidden bg-[#1a0a12] py-32">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1f0d16] to-[#0d060a]" />
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
          <section className="relative overflow-hidden bg-[#0d060a]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1f0d16]/50 to-[#0d060a]" />
            <div className="absolute inset-0 pattern-dots opacity-5" />
            <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="space-y-6">
                {publishedElements.map((el: BuilderElement) => (
                  <ElementRenderer key={el.id} element={el} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
