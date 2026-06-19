"use client";

/**
 * Per-member community panel layout.
 *
 * Remembers how each member sizes the two side rails (left channel list,
 * right members/detail rail) plus whether they've collapsed either one.
 * Persisted to localStorage so the layout survives reloads and is, in
 * practice, per-user (each member signs in on their own device — same
 * pattern Discord/Slack use for panel sizing).
 *
 * Widths are stored in px and consumed via a CSS variable so the rails
 * only pick up the custom width at the desktop breakpoint; on mobile the
 * left rail stays a full drawer and the right rail is hidden.
 *
 * Matches the house persist pattern (see store.ts / use-onboarding.ts):
 * createJSONStorage over localStorage, explicit name + version.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const LEFT_MIN = 200;
export const LEFT_MAX = 420;
export const LEFT_DEFAULT = 240; // matches the old w-60

export const RIGHT_MIN = 240;
export const RIGHT_MAX = 480;
export const RIGHT_DEFAULT = 288; // matches the old w-72

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(v)));

interface PanelLayoutState {
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  setLeftWidth: (w: number) => void;
  setRightWidth: (w: number) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  resetLeftWidth: () => void;
  resetRightWidth: () => void;
}

export const usePanelLayout = create<PanelLayoutState>()(
  persist(
    (set) => ({
      leftWidth: LEFT_DEFAULT,
      rightWidth: RIGHT_DEFAULT,
      leftCollapsed: false,
      rightCollapsed: false,
      setLeftWidth: (w) => set({ leftWidth: clamp(w, LEFT_MIN, LEFT_MAX) }),
      setRightWidth: (w) => set({ rightWidth: clamp(w, RIGHT_MIN, RIGHT_MAX) }),
      toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
      toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
      resetLeftWidth: () => set({ leftWidth: LEFT_DEFAULT }),
      resetRightWidth: () => set({ rightWidth: RIGHT_DEFAULT }),
    }),
    {
      name: "ayms-community-panels",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
