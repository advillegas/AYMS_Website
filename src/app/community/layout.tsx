"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { useAuthHydrated } from "@/lib/use-auth-hydrated";
import { CommunityShell } from "@/components/community/community-shell";
import { WelcomeJourney } from "@/components/community/welcome-journey";
import { CommunityTour } from "@/components/community/community-tour";
import { useOnboarding } from "@/lib/use-onboarding";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const user = useAuth((s) => s.user);
  // Onboarding gate: first-run auto-show is driven by the durable, per-user
  // `users.onboarded` DB flag (false only for brand-new members), so it shows
  // exactly once and never reappears cross-device. `reopened` lets a member
  // manually replay it from their profile.
  const onboardingReopened = useOnboarding((s) => s.reopened);
  const tourReopened = useOnboarding((s) => s.tourReopened);
  const showJourney =
    !!user && (user.onboarded === false || onboardingReopened);
  // Guided tour runs once after onboarding (or on a manual replay), never at
  // the same time as the welcome journey.
  const showTour =
    !!user && !showJourney && (user.tourDone === false || tourReopened);
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
      {/* Member Journey onboarding — additive overlay, shown ONCE per member
          via the durable per-user `onboarded` flag (or a manual replay). */}
      {showJourney && <WelcomeJourney />}
      {/* Guided tour — runs once after onboarding, replayable from the menu. */}
      {showTour && <CommunityTour />}
    </>
  );
}
