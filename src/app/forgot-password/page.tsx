"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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

  // Pre-fill from ?email= (passed by the login page when the user
  // already typed something into the identifier field).
  useEffect(() => {
    const prefill = searchParams.get("email");
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email address first.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await sendPasswordReset(trimmed);
      if (result.ok) {
        setSentTo(trimmed);
        toast.success("Check your inbox for a reset link.");
      } else {
        toast.error(result.error ?? "Couldn't send the reset email.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rosa/30 via-background to-blush/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgb(255_0_153_/_0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgb(106_27_77_/_0.08),transparent_50%)]" />

      <Card className="relative w-full max-w-md border-rosa/30 shadow-xl shadow-primary/5">
        <CardHeader className="text-center">
          <Link
            href="/"
            className="mb-2 inline-flex items-center justify-center gap-2"
          >
            <Image
              src="/ayms-logo.svg"
              alt="AYMS"
              width={48}
              height={48}
              className="rounded-full shadow-md shadow-primary/15"
            />
          </Link>
          <h1 className="text-xl font-semibold font-[family-name:var(--font-heading)]">
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll email you a secure link to set a new password.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isFirebaseConfigured && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Firebase Auth isn&apos;t configured on this site, so password
              reset is unavailable. Contact an admin.
            </div>
          )}

          {sentTo && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting || !isFirebaseConfigured}
                  className="pl-9 border-rosa/30 focus-visible:ring-primary/30"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting || !isFirebaseConfigured}
              className="w-full bg-gradient-to-r from-primary to-magenta text-white border-0 hover:opacity-90 shadow-md shadow-primary/20"
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
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
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
