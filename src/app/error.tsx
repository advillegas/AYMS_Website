"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1a0a12] px-4 py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] via-[#1a0a12] to-[#1A0814]" />
      <div className="aurora opacity-40" />
      <div className="absolute inset-0 pattern-dots opacity-[0.07]" />
      <div className="relative mx-auto max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-md shadow-[0_0_32px_rgb(255_0_153/0.25)]">
          <AlertTriangle className="h-8 w-8 text-[#FFB3D0]" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#FFB3D0]">
          Something went wrong
        </p>
        <h1 className="mt-4 text-hero font-extrabold text-white text-balance">
          A little <span className="text-gradient-brand">bump</span> in the road
        </h1>
        <p className="text-lead mx-auto mt-5 max-w-md text-white/60">
          We hit an unexpected error. Try again, or head back home — your amigas
          are waiting.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className={cn(
              buttonVariants({ size: "lg" }),
              "lift h-12 rounded-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-8 text-base font-semibold text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110",
            )}
          >
            Try again
          </button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 rounded-full border-white/20 bg-white/[0.06] px-8 text-base font-semibold text-white backdrop-blur-md hover:bg-white/10",
            )}
          >
            Back home
          </Link>
        </div>
        {error?.digest ? (
          <p className="mt-6 text-xs text-white/30">Error ID: {error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
