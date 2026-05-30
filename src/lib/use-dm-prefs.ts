"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Per-conversation notification preferences for direct messages and
 * group chats. Stored locally in the browser - this is intentional,
 * mute is a per-device setting (you can be muted on your laptop but
 * still get pings on your phone).
 *
 * Two states per conversation:
 *   - "all" (default): every new message triggers a browser push
 *   - "none": muted (no notifications, but the chat still updates)
 */

export type DMNotifyLevel = "all" | "none";

interface DMPrefsState {
  prefs: Record<string, DMNotifyLevel>;
  setLevel: (conversationId: string, level: DMNotifyLevel) => void;
  getLevel: (conversationId: string) => DMNotifyLevel;
  toggleMute: (conversationId: string) => void;
  isMuted: (conversationId: string) => boolean;
}

export const useDMPrefs = create<DMPrefsState>()(
  persist(
    (set, get) => ({
      prefs: {},
      setLevel: (conversationId, level) =>
        set((s) => ({ prefs: { ...s.prefs, [conversationId]: level } })),
      getLevel: (conversationId) => get().prefs[conversationId] ?? "all",
      toggleMute: (conversationId) =>
        set((s) => {
          const cur = s.prefs[conversationId] ?? "all";
          return {
            prefs: {
              ...s.prefs,
              [conversationId]: cur === "none" ? "all" : "none",
            },
          };
        }),
      isMuted: (conversationId) => get().prefs[conversationId] === "none",
    }),
    {
      name: "ayms-dm-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
