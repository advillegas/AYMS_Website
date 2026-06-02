"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/store";
import { isFirebaseConfigured } from "@/lib/firebase";
import { toast } from "sonner";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { Loader2 } from "lucide-react";
import { GoogleButton } from "@/components/auth/google-button";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const login = useAuth((s) => s.login);
  const loginWithGoogle = useAuth((s) => s.loginWithGoogle);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(identifier, password);
      if (result.ok) {
        toast.success("Welcome back, amiga! ♡");
        // Always land in the community after sign-in. Admins reach the
        // CMS builder via the dedicated button in the nav, and the
        // community admin panel via the Admin tab inside /community.
        router.push("/community");
      } else {
        toast.error(result.error ?? "Invalid credentials");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.ok) {
        toast.success("Welcome back, amiga! ♡");
        router.push("/community");
      } else {
        toast.error(result.error ?? "Couldn't sign in with Google");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <CmsPageWrapper slug="login">
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
                  src="/ayms-logo.svg"
                  alt="AYMS"
                  width={64}
                  height={64}
                  className="rounded-full shadow-[0_0_28px_rgb(255_0_153/0.25)]"
                />
              </Link>
              <h1 className="text-title font-[family-name:var(--font-heading)] font-bold mt-4">Welcome back, amiga</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in with your username, email, or Google account
              </p>
            </div>

            <div className="space-y-5">
              {isFirebaseConfigured && (
                <>
                  <GoogleButton
                    onClick={handleGoogle}
                    loading={googleLoading}
                    disabled={submitting}
                  />
                  <div className="relative flex items-center">
                    <span className="flex-1 border-t border-rosa/25" />
                    <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      or
                    </span>
                    <span className="flex-1 border-t border-rosa/25" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-sm font-semibold">Username or Email</Label>
                  <Input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="you@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={submitting || googleLoading}
                    className="h-11 rounded-xl border-rosa/30 bg-white/60 focus-visible:ring-primary/30 focus-visible:border-primary/40 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                    <Link
                      href={`/forgot-password${
                        identifier.trim() && identifier.includes("@")
                          ? `?email=${encodeURIComponent(identifier.trim())}`
                          : ""
                      }`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting || googleLoading}
                    className="h-11 rounded-xl border-rosa/30 bg-white/60 focus-visible:ring-primary/30 focus-visible:border-primary/40 backdrop-blur-sm"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting || googleLoading}
                  className="lift w-full h-12 rounded-full border-0 bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] font-semibold tracking-wide text-white shadow-[0_8px_24px_rgb(255_0_153/0.30)] hover:brightness-110"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>Log In</>
                  )}
                </Button>
              </form>
            </div>

            {/* Footer link */}
            <p className="mt-7 text-center text-sm text-muted-foreground">
              Not an amiga yet?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Join us
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </CmsPageWrapper>
  );
}
