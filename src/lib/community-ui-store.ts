"use client";

import { create } from "zustand";
import type { ProfileSnapshot } from "./profile-lookup";

/**
 * UI-only state for the community surface.
 *
 * Lives outside the chat / Firebase data store so picking a member or
 * opening a thread is instant and never causes a Firestore re-fetch.
 */

interface ThreadTarget {
  channelId: string;
  parentId: string;
  parentUserId?: string;
  parentUserName: string;
  parentContent: string;
}

export interface ProfileTarget {
  id: string;
  // Snapshot data for users not in the static members list (e.g.
  // admins, recently-registered users, anyone we only know about
  // because they sent a chat message). Used as fallback by
  // useProfileLookup when the id can't be resolved.
  snapshot?: ProfileSnapshot;
}

interface CommunityUIState {
  selectedProfile: ProfileTarget | null;
  activeThread: ThreadTarget | null;
  selectProfile: (target: ProfileTarget | null) => void;
  openThread: (t: ThreadTarget) => void;
  closeThread: () => void;
}

export const useCommunityUI = create<CommunityUIState>((set) => ({
  selectedProfile: null,
  activeThread: null,
  selectProfile: (target) =>
    set((s) => ({
      selectedProfile: target,
      // Closing a profile also closes any open thread - one sidecar
      // at a time keeps the layout from getting noisy.
      activeThread: target ? null : s.activeThread,
    })),
  openThread: (t) => set({ activeThread: t, selectedProfile: null }),
  closeThread: () => set({ activeThread: null }),
}));
