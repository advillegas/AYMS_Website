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
  const page = useCms((s) => s.pages[slug]);

  // CmsPageWrapper (rendered in both branches below) owns the realtime
  // Firestore subscription that hydrates useCms.pages, so we don't hydrate
  // here — doing so would race the snapshot with a stale localStorage write.
  // We only flip `mounted` after the first client render so the initial paint
  // matches the server HTML (avoids a hydration mismatch).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <CmsPageWrapper slug={slug}>
        <Navbar />
        <main className="min-h-screen pt-[88px]">
          <section className="grain relative overflow-hidden bg-[#FDFCF7] py-32">
            <div className="absolute inset-0 pattern-dots opacity-[0.04]" aria-hidden="true" />
            <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center" aria-busy="true" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF0099]" aria-hidden="true" />
              <p className="mt-4 text-sm text-ink-soft">Loading page…</p>
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
          <section className="grain relative overflow-hidden bg-[#FDFCF7] py-32">
            <div className="absolute inset-0 pattern-dots opacity-[0.04]" aria-hidden="true" />
            <div className="relative mx-auto max-w-3xl px-4 text-center">
              <FileX className="mx-auto h-12 w-12 text-[#221019]/20 mb-4" />
              <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">
                Page Not Found
              </h1>
              <p className="mt-4 text-ink-soft">
                This page doesn&apos;t exist or hasn&apos;t been published yet.
              </p>
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
              >
                Go Home
              </Link>
            </div>
          </section>
        ) : (
          <section className="grain relative bg-[#FDFCF7]">
            <div className="absolute inset-0 pattern-dots opacity-[0.04]" aria-hidden="true" />
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
