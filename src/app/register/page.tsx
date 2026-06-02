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

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const register = useAuth((s) => s.register);
  const loginWithGoogle = useAuth((s) => s.loginWithGoogle);
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const result = await register(name, email, password);
      if (result.ok) {
        toast.success("Welcome to the family, amiga! ♡");
        router.push("/community");
      } else {
        toast.error(result.error ?? "Could not create account");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      // Same call as login - Firebase Auth treats first-time popup
      // sign-in as registration automatically and the firestore upsert
      // creates the profile doc.
      const result = await loginWithGoogle();
      if (result.ok) {
        toast.success("Welcome to the family, amiga! ♡");
        router.push("/community");
      } else {
        toast.error(result.error ?? "Couldn't sign up with Google");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <CmsPageWrapper slug="register">
      <div className="grain relative flex min-h-screen items-center justify-center px-4 py-12 overflow-hidden bg-[#FFF7FB]">
        {/* Brand background mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-rosa/35 via-background to-blush/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_25%_80%,rgb(255_0_153/0.09),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_78%_18%,rgb(181_23_96/0.07),transparent_55%)]" />
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
              <h1 className="text-title font-[family-name:var(--font-heading)] font-bold mt-4">Become an Amiga</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your account and join the community
              </p>
            </div>

            <div className="space-y-5">
              {isFirebaseConfigured && (
                <>
                  <GoogleButton
                    onClick={handleGoogle}
                    loading={googleLoading}
                    disabled={submitting}
                    label="Continue with Google"
                  />
                  <div className="relative flex items-center">
                    <span className="flex-1 border-t border-rosa/25" />
                    <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      or with email
                    </span>
                    <span className="flex-1 border-t border-rosa/25" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting || googleLoading}
                    className="h-11 rounded-xl border-rosa/30 bg-white/60 focus-visible:ring-primary/30 focus-visible:border-primary/40 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting || googleLoading}
                    className="h-11 rounded-xl border-rosa/30 bg-white/60 focus-visible:ring-primary/30 focus-visible:border-primary/40 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting || googleLoading}
                    className="h-11 rounded-xl border-rosa/30 bg-white/60 focus-visible:ring-primary/30 focus-visible:border-primary/40 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-sm font-semibold">Confirm Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={submitting || googleLoading}
                    className="h-11 rounded-xl border-rosa/30 bg-white/60 focus-visible:ring-primary/30 focus-visible:border-primary/40 backdrop-blur-sm"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting || googleLoading}
                  className="lift w-full h-12 rounded-full border-0 bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] font-semibold tracking-wide text-white shadow-[0_8px_24px_rgb(255_0_153/0.30)] hover:brightness-110 mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>Become an Amiga ♡</>
                  )}
                </Button>
              </form>
            </div>

            {/* Footer link */}
            <p className="mt-7 text-center text-sm text-muted-foreground">
              Already an amiga?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Log In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </CmsPageWrapper>
  );
}
