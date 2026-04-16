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
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuth((s) => s.login);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    const ok = login(email, password);
    if (ok) {
      toast.success("Welcome back, amiga! ♡");
      router.push("/community");
    } else {
      toast.error("Invalid credentials");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rosa/15 via-background to-lavender/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,oklch(0.60_0.24_340/0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,oklch(0.80_0.08_300/0.08),transparent_50%)]" />

      <Card className="relative w-full max-w-md border-rosa/20 shadow-xl shadow-primary/5">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 inline-flex items-center justify-center gap-2">
            <Image src="/ayms-logo.svg" alt="AYMS" width={48} height={48} className="rounded-full shadow-md shadow-primary/15" />
          </Link>
          <h1 className="text-xl font-semibold font-[family-name:var(--font-heading)]">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access the community portal
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                className="border-rosa/20 focus-visible:ring-primary/30"
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-magenta text-white border-0 hover:opacity-90 shadow-md shadow-primary/20">
              Sign In ♡
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
  );
}
