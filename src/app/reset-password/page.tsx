"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase";
import { friendlyAuthError } from "@/lib/firebase-auth";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

/**
 * Password-recovery completion page (Supabase).
 *
 * The reset email sent by supabaseSendPasswordReset redirects here
 * with a recovery token in the URL. supabase-js (detectSessionInUrl)
 * exchanges it for a session automatically and emits PASSWORD_RECOVERY;
 * once that session exists we let the user set a new password via
 * auth.updateUser({ password }). Without a recovery session (expired or
 * already-used link, or a direct visit) we point back to
 * /forgot-password for a fresh link.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  // null = still waiting for supabase-js to consume the URL token;
  // true = recovery session present; false = no session (dead link).
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setSessionReady(false);
      return;
    }
    // PASSWORD_RECOVERY (and SIGNED_IN) fire after detectSessionInUrl
    // consumes the token; getSession covers reloads where that already
    // happened earlier in the session.
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setSessionReady(true);
    });
    void sb.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });
    // If no recovery session materialises, stop waiting and show the
    // dead-link notice instead of a spinner forever.
    const timer = setTimeout(
      () => setSessionReady((prev) => (prev === null ? false : prev)),
      5000,
    );
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  function validate() {
    const next: { password?: string; confirm?: string } = {};
    if (!password) {
      next.password = "Create a new password.";
    } else if (password.length < 6) {
      next.password = "Password must be at least 6 characters.";
    }
    if (!confirm) {
      next.confirm = "Re-enter your new password.";
    } else if (password !== confirm) {
      next.confirm = "Passwords don't match.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    const sb = getSupabase();
    if (!sb) return;
    setSubmitting(true);
    try {
      const { error } = await sb.auth.updateUser({ password });
      if (error) {
        const message = friendlyAuthError(error);
        setErrors({ password: message });
        toast.error(message);
        return;
      }
      toast.success("Password updated. Welcome back, amiga! ♡");
      // The recovery link signed the user in (onSupabaseAuthChange has
      // applied the session to the store) — land them in the community.
      router.push("/community");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grain relative flex min-h-screen items-center justify-center px-4 overflow-hidden bg-[#FFF7FB]">
        {/* Brand background mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-rosa/40 via-background to-blush/25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_20%_15%,rgb(255_0_153/0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_85%,rgb(106_27_77/0.07),transparent_55%)]" />
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
                  src="/ayms-wordmark.png"
                  alt="Amigas Y Más Social"
                  width={266}
                  height={192}
                  priority
                  unoptimized
                  className="h-24 w-auto drop-shadow-[0_0_24px_rgb(255_0_153/0.22)]"
                />
              </Link>
              <h1 className="text-title font-[family-name:var(--font-heading)] font-bold mt-4">Set a new password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a new password for your account
              </p>
            </div>

            <div className="space-y-5">
              {sessionReady === null && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" role="status" aria-live="polite">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking your reset link...
                </div>
              )}

              {sessionReady === false && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/8 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                  This reset link is invalid or has expired.{" "}
                  <Link href="/forgot-password" className="font-semibold underline">
                    Request a new one
                  </Link>{" "}
                  and try again.
                </div>
              )}

              {sessionReady && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-semibold">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                        if (errors.confirm && e.target.value === confirm) {
                          setErrors((p) => ({ ...p, confirm: undefined }));
                        }
                      }}
                      disabled={submitting}
                      aria-invalid={errors.password ? true : undefined}
                      aria-describedby={errors.password ? "new-password-error" : undefined}
                      className="h-11 rounded-xl border-rosa/30 bg-white/60 focus-visible:ring-primary/30 focus-visible:border-primary/40 backdrop-blur-sm"
                    />
                    {errors.password && (
                      <p id="new-password-error" role="alert" className="text-xs font-medium text-destructive">
                        {errors.password}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-semibold">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
                      }}
                      disabled={submitting}
                      aria-invalid={errors.confirm ? true : undefined}
                      aria-describedby={errors.confirm ? "confirm-password-error" : undefined}
                      className="h-11 rounded-xl border-rosa/30 bg-white/60 focus-visible:ring-primary/30 focus-visible:border-primary/40 backdrop-blur-sm"
                    />
                    {errors.confirm && (
                      <p id="confirm-password-error" role="alert" className="text-xs font-medium text-destructive">
                        {errors.confirm}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="lift w-full h-12 rounded-full border-0 bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] font-semibold tracking-wide text-white shadow-[0_8px_24px_rgb(255_0_153/0.30)] hover:brightness-110"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      <>Update Password</>
                    )}
                  </Button>
                </form>
              )}
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
