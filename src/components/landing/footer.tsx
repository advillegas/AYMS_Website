"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { useNewsletter } from "@/lib/use-newsletter";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FooterSignup() {
  const { submitting, subscribe } = useNewsletter();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    // Capture only — persists to Firestore, never sends email.
    const result = await subscribe({ email: trimmed, source: "footer" });
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setEmail("");
    setDone(true);
  }

  return (
    <div className="w-full max-w-sm">
      <p className="text-sm font-semibold text-white/80">
        Get trips &amp; events in your inbox
      </p>
      <p className="mt-1 text-xs text-white/45">
        No spam, ever. Unsubscribe anytime. ♡
      </p>
      {done ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-[#FF0099]/30 bg-[#FF0099]/10 px-4 py-3 text-sm font-medium text-[#FFB3D0]"
        >
          You&apos;re on the list — gracias! ♡
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <label htmlFor="footer-newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="footer-newsletter-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
            className="h-11 flex-1 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus-visible:border-[#FF0099]/40 focus-visible:ring-2 focus-visible:ring-[#FF0099]/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            aria-label="Subscribe to the newsletter"
            className="lift flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_6px_24px_rgb(255_0_153/0.30)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a0a12] disabled:opacity-70"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#1a0a12] py-16">
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f060a] to-[#1a0a12]" />
      <div className="absolute inset-0 pattern-dots opacity-[0.06]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <Link
            href="/"
            aria-label="Amigas Y Más Social — home"
            className="flex flex-col items-center gap-2 md:items-start"
          >
            <Image
              src="/ayms-wordmark.png"
              alt="Amigas Y Más Social"
              width={266}
              height={192}
              className="h-20 w-auto drop-shadow-[0_0_20px_rgb(255_0_153/0.30)]"
            />
            <p className="text-[10px] text-white/60 tracking-[0.22em] uppercase font-medium">
              connect · empower · celebrate
            </p>
          </Link>

          <div className="flex flex-col items-center gap-5 md:flex-row md:items-end">
            <FooterSignup />
            <a
              href="https://www.instagram.com/amigasymassocial/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Amigas Y Más Social on Instagram (opens in a new tab)"
              className="lift flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/60 transition-colors hover:text-[#FF0099] hover:border-[#FF0099]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a0a12]"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.07] pt-6 text-center text-sm text-white/60">
          &copy; {new Date().getFullYear()} Amigas Y Más Social. All rights
          reserved. ♡
        </div>
      </div>
    </footer>
  );
}
