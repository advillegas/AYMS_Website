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
    <div className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rosa/30 via-background to-blush/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgb(255_0_153_/_0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgb(106_27_77_/_0.08),transparent_50%)]" />

      <Card className="relative w-full max-w-md border-rosa/30 shadow-xl shadow-primary/5">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 inline-flex items-center justify-center gap-2">
            <Image src="/ayms-logo.svg" alt="AYMS" width={48} height={48} className="rounded-full shadow-md shadow-primary/15" />
          </Link>
          <h1 className="text-xl font-semibold font-[family-name:var(--font-heading)]">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your username, email, or Google account
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFirebaseConfigured && (
            <>
              <GoogleButton
                onClick={handleGoogle}
                loading={googleLoading}
                disabled={submitting}
              />
              <div className="relative flex items-center">
                <span className="flex-1 border-t border-rosa/20" />
                <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  or
                </span>
                <span className="flex-1 border-t border-rosa/20" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="admin or you@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={submitting || googleLoading}
                className="border-rosa/30 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href={`/forgot-password${
                    identifier.trim() && identifier.includes("@")
                      ? `?email=${encodeURIComponent(identifier.trim())}`
                      : ""
                  }`}
                  className="text-xs text-primary hover:underline"
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
                className="border-rosa/30 focus-visible:ring-primary/30"
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
                  Signing in...
                </>
              ) : (
                <>Sign In ♡</>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Not an amiga yet?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Join us
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
    </CmsPageWrapper>
  );
}
