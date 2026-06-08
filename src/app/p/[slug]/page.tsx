"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCms } from "@/lib/cms-store";
import { ElementRenderer } from "@/components/builder/element-renderer";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { FileX, Loader2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DynamicPage() {
  const params = useParams();
  const slug = params.slug as string;
  const loadFromStorage = useCms((s) => s.loadFromStorage);
  const page = useCms((s) => s.pages[slug]);

  // Page content is hydrated from localStorage on the client only. Until that
  // happens, render a neutral placeholder so the first client render matches
  // the server-rendered HTML (avoids a hydration mismatch).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadFromStorage();
    setMounted(true);
  }, [loadFromStorage]);

  if (!mounted) {
    return (
      <CmsPageWrapper slug={slug}>
        <Navbar />
        <main className="min-h-screen pt-[88px]">
          <section className="relative overflow-hidden bg-[#1a0a12] py-32">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] to-[#1A0814]" />
            <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center" aria-busy="true" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-[#FFB3D0]" aria-hidden="true" />
              <p className="mt-4 text-sm text-white/40">Loading page…</p>
              <span className="sr-only">Loading page content</span>
            </div>
          </section>
        </main>
        <Footer />
      </CmsPageWrapper>
    );
  }

  return (
    <CmsPageWrapper slug={slug}>
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {!page || !page.isPublished || page.elements.length === 0 ? (
          <section className="relative overflow-hidden bg-[#1a0a12] py-32">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] to-[#1A0814]" />
            <div className="relative mx-auto max-w-3xl px-4 text-center">
              <FileX className="mx-auto h-12 w-12 text-white/20 mb-4" />
              <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-white">
                Page Not Found
              </h1>
              <p className="mt-4 text-white/40">
                This page doesn&apos;t exist or hasn&apos;t been published yet.
              </p>
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "outline" }), "mt-6 border-white/20 text-white hover:bg-white/10")}
              >
                Go Home
              </Link>
            </div>
          </section>
        ) : (
          <section className="relative bg-[#1A0814]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A]/30 to-[#1A0814]" />
            <div className="absolute inset-0 pattern-dots opacity-5" />
            <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="space-y-6">
                {page.elements.map((el) => (
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
