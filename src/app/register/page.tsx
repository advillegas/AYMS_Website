"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
    <div className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rosa/15 via-background to-gold/8" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgb(255_0_153/0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,oklch(0.82_0.12_85/0.08),transparent_50%)]" />

      <Card className="relative w-full max-w-md border-rosa/20 shadow-xl shadow-primary/5">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 inline-flex items-center justify-center gap-2">
            <Image src="/ayms-logo.svg" alt="AYMS" width={48} height={48} className="rounded-full shadow-md shadow-primary/15" />
          </Link>
          <h1 className="text-xl font-semibold font-[family-name:var(--font-heading)]">Become an Amiga</h1>
          <p className="text-sm text-muted-foreground">
            Create your account and join the community
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFirebaseConfigured && (
            <>
              <GoogleButton
                onClick={handleGoogle}
                loading={googleLoading}
                disabled={submitting}
                label="Sign up with Google"
              />
              <div className="relative flex items-center">
                <span className="flex-1 border-t border-rosa/20" />
                <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  or with email
                </span>
                <span className="flex-1 border-t border-rosa/20" />
              </div>
            </>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting || googleLoading}
                className="border-rosa/20 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting || googleLoading}
                className="border-rosa/20 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting || googleLoading}
                className="border-rosa/20 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={submitting || googleLoading}
                className="border-rosa/20 focus-visible:ring-primary/30"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || googleLoading}
              className="w-full bg-gradient-to-r from-primary to-magenta text-white border-0 hover:opacity-90 shadow-md shadow-primary/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>Create Account ♡</>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already an amiga?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
    </CmsPageWrapper>
  );
}
