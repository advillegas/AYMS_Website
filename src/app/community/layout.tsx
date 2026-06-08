"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { useAuthHydrated } from "@/lib/use-auth-hydrated";
import { CommunityShell } from "@/components/community/community-shell";
import { WelcomeJourney } from "@/components/community/welcome-journey";
import { useOnboarding } from "@/lib/use-onboarding";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  // Onboarding gate: show the warm welcome journey once per member.
  // Purely additive — it never affects the auth redirect below.
  const onboardingCompleted = useOnboarding((s) => s.completed);
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
      {/* Member Journey onboarding — additive overlay, shown once.
          Gated on hydrated + authenticated above, so it only appears
          for a signed-in member who hasn't completed/dismissed it. */}
      {!onboardingCompleted && <WelcomeJourney />}
    </>
  );
}
