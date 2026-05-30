"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { useAuthHydrated } from "@/lib/use-auth-hydrated";
import { CommunityShell } from "@/components/community/community-shell";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const router = useRouter();
  // CRITICAL: wait for the persist middleware to finish reading
  // localStorage before deciding to redirect. Without this gate, every
  // cold load of /community bounces signed-in users to /login because
  // `isAuthenticated` is false on the first render.
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <>
      {/* noindex: community is a private member area with no SEO value */}
      <meta name="robots" content="noindex, nofollow" />
      <CommunityShell>{children}</CommunityShell>
    </>
  );
}
