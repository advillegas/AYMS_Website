"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/store";
import { isFirebaseConfigured } from "@/lib/firebase";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

/**
 * Password-reset request page.
 *
 * Sends a Firebase Auth password-reset email. The link in the email
 * lands on a Firebase-hosted handler page (or a custom action handler
 * if configured in Firebase Console → Authentication → Templates).
 *
 * On success we keep the user on this page with a confirmation banner
 * rather than auto-redirecting; that way they can re-enter the email
 * if they typo'd it (the Firebase API intentionally doesn't tell us
 * whether an email exists, to prevent enumeration attacks).
 */
function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const sendPasswordReset = useAuth((s) => s.sendPasswordReset);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from ?email= (passed by the login page when the user
  // already typed something into the identifier field).
  useEffect(() => {
    const prefill = searchParams.get("email");
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address first.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("That doesn't look like a valid email address.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await sendPasswordReset(trimmed);
      if (result.ok) {
        setSentTo(trimmed);
        toast.success("Check your inbox for a reset link.");
      } else {
        const message = result.error ?? "Couldn't send the reset email.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grain relative flex min-h-screen items-center justify-center px-4 overflow-hidden bg-[#FFF7FB]">
      {/* Brand background mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-rosa/40 via-background to-blush/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_30%_20%,rgb(255_0_153/0.09),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_70%_80%,rgb(106_27_77/0.07),transparent_55%)]" />
      <div className="absolute inset-0 pattern-dots opacity-[0.05]" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Glass card */}
        <div className="glass-strong rounded-3xl border border-rosa/35 elevate-4 px-8 py-10">
          {/* Logo + heading */}
          <div className="mb-8 text-center">
            <Link href="/" className="mb-5 inline-flex items-center justify-center">
              <Image
                src="/ayms-logo.svg"
                alt="AYMS"
                width={64}
                height={64}
                className="rounded-full shadow-[0_0_28px_rgb(255_0_153/0.25)]"
              />
            </Link>
            <h1 className="text-title font-[family-name:var(--font-heading)] font-bold mt-4">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ll email you a secure link to set a new password.
            </p>
          </div>

          <div className="space-y-5">
            {!isFirebaseConfigured && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/8 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                Firebase Auth isn&apos;t configured on this site, so password
                reset is unavailable. Contact an admin.
              </div>
            )}

            {sentTo && (
              <div role="status" aria-live="polite" className="rounded-xl border border-emerald-500/40 bg-emerald-500/8 px-4 py-3.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Check your inbox.</p>
                  <p>
                    If an account exists for <strong>{sentTo}</strong>,
                    we&apos;ve sent a password-reset link. The link expires
                    after one hour.
                  </p>
                  <p className="text-emerald-700/80 dark:text-emerald-300/70 italic">
                    Don&apos;t see it? Check your spam folder, or wait a
                    minute and try again.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={submitting || !isFirebaseConfigured}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "reset-email-error" : undefined}
                    className="h-11 rounded-xl pl-10 border-rosa/30 bg-white/60 focus-visible:ring-primary/30 focus-visible:border-primary/40 backdrop-blur-sm"
                  />
                </div>
                {error && (
                  <p id="reset-email-error" role="alert" className="text-xs font-medium text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={submitting || !isFirebaseConfigured}
                className="lift w-full h-12 rounded-full border-0 bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] font-semibold tracking-wide text-white shadow-[0_8px_24px_rgb(255_0_153/0.30)] hover:brightness-110"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : sentTo ? (
                  <>Send another link</>
                ) : (
                  <>Send reset link</>
                )}
              </Button>
            </form>
          </div>

          {/* Footer link */}
          <div className="mt-7 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordInner />
    </Suspense>
  );
}
