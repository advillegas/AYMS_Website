"use client";

/**
 * Member Journey onboarding state.
 *
 * Local-only Zustand store (persisted to localStorage) that tracks
 * whether the signed-in member has completed — or dismissed — the warm
 * welcome stepper. The actual answers (interests, languages, headline,
 * first passport stamp) are written to Firestore via updateProfile() /
 * usePassport() by the welcome-journey component; this store only owns
 * the "should we show it" flag and the current step so the flow survives
 * a refresh mid-way.
 *
 * Matches the house persist pattern (see store.ts): createJSONStorage
 * over localStorage, explicit name + version.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface OnboardingState {
  /** True once the member finishes (or explicitly skips) the journey. */
  completed: boolean;
  /**
   * Transient "show it again" flag for a MANUAL re-open from the profile.
   * Distinct from the durable, per-user `users.onboarded` DB flag that drives
   * the first-run auto-show — `reopened` lets a member who already onboarded
   * re-watch the journey without flipping their permanent onboarded state.
   */
  reopened: boolean;
  /** Current step index (0-based) so a refresh resumes in place. */
  step: number;
  /** ISO timestamp of a "maybe later" dismissal, if any. */
  dismissedAt?: string;
  /** Transient "replay the guided tour" flag (manual start from the menu). */
  tourReopened: boolean;
  setStep: (step: number) => void;
  next: () => void;
  back: () => void;
  complete: () => void;
  dismiss: () => void;
  /** Re-open the journey (e.g. from a "finish setup" affordance). */
  reopen: () => void;
  /** Manually (re)start the guided community tour. */
  startTour: () => void;
  /** End the guided tour (finished or skipped). */
  endTour: () => void;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      reopened: false,
      tourReopened: false,
      step: 0,
      dismissedAt: undefined,
      setStep: (step) => set({ step: Math.max(0, step) }),
      next: () => set((s) => ({ step: s.step + 1 })),
      back: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
      complete: () => set({ completed: true, reopened: false }),
      dismiss: () =>
        set({
          completed: true,
          reopened: false,
          dismissedAt: new Date().toISOString(),
        }),
      reopen: () =>
        set({ completed: false, reopened: true, step: 0, dismissedAt: undefined }),
      startTour: () => set({ tourReopened: true }),
      endTour: () => set({ tourReopened: false }),
    }),
    {
      name: "ayms-onboarding",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
);
