import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        <section className="grain relative flex min-h-[calc(100vh-88px)] items-center justify-center overflow-hidden bg-[#1a0a12] py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A] via-[#1a0a12] to-[#1A0814]" />
          <div className="aurora opacity-50" />
          <div className="absolute inset-0 pattern-dots opacity-[0.07]" />
          <div className="relative mx-auto max-w-xl px-4 text-center sm:px-6">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-md shadow-[0_0_32px_rgb(255_0_153/0.25)]">
              <Compass className="h-8 w-8 text-[#FFB3D0]" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#FFB3D0]">
              404 — Page Not Found
            </p>
            <h1 className="mt-4 text-hero font-extrabold text-white text-balance">
              Looks like you wandered{" "}
              <span className="text-gradient-brand">off the map</span>
            </h1>
            <p className="text-lead mx-auto mt-5 max-w-md text-white/60">
              The page you&apos;re looking for took a different trip. Let&apos;s
              get you back to the adventure.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "lift h-12 rounded-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-8 text-base font-semibold text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110",
                )}
              >
                Back home ♡
              </Link>
              <Link
                href="/trips"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 rounded-full border-white/20 bg-white/[0.06] px-8 text-base font-semibold text-white backdrop-blur-md hover:bg-white/10",
                )}
              >
                Explore trips
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
