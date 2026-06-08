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
  /** Current step index (0-based) so a refresh resumes in place. */
  step: number;
  /** ISO timestamp of a "maybe later" dismissal, if any. */
  dismissedAt?: string;
  setStep: (step: number) => void;
  next: () => void;
  back: () => void;
  complete: () => void;
  dismiss: () => void;
  /** Re-open the journey (e.g. from a "finish setup" affordance). */
  reopen: () => void;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      step: 0,
      dismissedAt: undefined,
      setStep: (step) => set({ step: Math.max(0, step) }),
      next: () => set((s) => ({ step: s.step + 1 })),
      back: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
      complete: () => set({ completed: true }),
      dismiss: () =>
        set({ completed: true, dismissedAt: new Date().toISOString() }),
      reopen: () => set({ completed: false, step: 0, dismissedAt: undefined }),
    }),
    {
      name: "ayms-onboarding",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
