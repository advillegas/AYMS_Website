"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useMemo } from "react";
import { useRoles } from "./use-roles-store";
import type { Channel } from "./store";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import {
  writeChannelsToSupabase,
  deleteChannelFromSupabase,
  useChannelsSyncSupabase,
} from "./use-channels-supabase";

/**
 * Channels store with CRUD + role-based view restrictions + channel
 * type (text / voice / video).
 *
 * Synced to Firestore in realtime via config/channels document.
 * localStorage kept as a fallback cache for offline / non-Firebase.
 */

export type ChannelType = "text" | "voice" | "video";

export interface ChannelGeoLocation {
  label: string;
  lat: number;
  lng: number;
}

export interface RichChannel extends Channel {
  type: ChannelType;
  /**
   * If non-empty, only members with at least one of these roleIds can
   * view + post in this channel. Empty array = open to everyone with
   * the viewChannels permission.
   */
  restrictedRoleIds: string[];
  /**
   * Soft-delete archive. Hidden from the channel list but kept around
   * so messages aren't orphaned. (Hard delete is offered separately.)
   */
  archived?: boolean;
  /**
   * Display order within the channel's category. Lower comes first.
   * Spaced out by 10 so insertions / drag-drop don't have to renumber
   * the whole list every time.
   */
  position: number;
  createdAt: number;
  /**
   * Optional user ID of the member who created this channel. Lets us
   * surface "your channel" UX and gate moderation actions to creator
   * + admins. System defaults leave this undefined.
   */
  createdBy?: string;
  /**
   * Geo-channel anchors. When non-empty, this channel filters its
   * messages to authors whose coordinates fall within
   * `geoRadiusMiles` of any of these locations. Members can attach
   * any number of zip codes / cities / addresses so a channel can
   * span multiple regions (e.g. "Bay Area + Sacramento").
   */
  geoLocations?: ChannelGeoLocation[];
  /** Default 50 miles when unset. */
  geoRadiusMiles?: number;
  /**
   * Convenience flag — true when `geoLocations` is non-empty. Stored
   * explicitly so the UI can distinguish "user disabled geo" from
   * "no locations added yet" without inferring from array length.
   */
  isGeoChannel?: boolean;
}

// Positions are spaced by 10 within each category so admins can
// inject channels between existing ones without renumbering.
const DEFAULT_CHANNELS: RichChannel[] = [
  // General
  { id: "general", name: "General", description: "Welcome! Say hi and introduce yourself", icon: "💬", category: "general", type: "text", restrictedRoleIds: [], position: 10, createdAt: Date.parse("2026-01-01") },
  { id: "local", name: "Local", description: "Chat with amigas near you — filtered by your location radius", icon: "📍", category: "general", type: "text", restrictedRoleIds: [], position: 15, createdAt: Date.parse("2026-01-01") },
  { id: "announcements", name: "Announcements", description: "Important updates from the AYMS team", icon: "📢", category: "general", type: "text", restrictedRoleIds: [], position: 20, createdAt: Date.parse("2026-01-01") },
  { id: "introductions", name: "Introductions", description: "New here? Tell us about yourself!", icon: "👋", category: "general", type: "text", restrictedRoleIds: [], position: 30, createdAt: Date.parse("2026-01-01") },
  // Trips
  { id: "trip-planning", name: "Trip Planning", description: "Plan and discuss upcoming trips", icon: "✈️", category: "trips", type: "text", restrictedRoleIds: [], position: 10, createdAt: Date.parse("2026-01-01") },
  { id: "travel-tips", name: "Travel Tips", description: "Share your best travel advice", icon: "🗺️", category: "trips", type: "text", restrictedRoleIds: [], position: 20, createdAt: Date.parse("2026-01-01") },
  { id: "trip-photos", name: "Trip Photos", description: "Share your favorite travel photos", icon: "📸", category: "trips", type: "text", restrictedRoleIds: [], position: 30, createdAt: Date.parse("2026-01-01") },
  // Events
  { id: "upcoming-events", name: "Upcoming Events", description: "What's happening next?", icon: "📅", category: "events", type: "text", restrictedRoleIds: [], position: 10, createdAt: Date.parse("2026-01-01") },
  { id: "camp-talk", name: "Camp Talk", description: "Everything about AYMS Summer Camp", icon: "🏕️", category: "events", type: "text", restrictedRoleIds: [], position: 20, createdAt: Date.parse("2026-01-01") },
  // Fun
  { id: "voice-lounge", name: "Voice Lounge", description: "Drop-in voice chat", icon: "🎤", category: "fun", type: "voice", restrictedRoleIds: [], position: 10, createdAt: Date.parse("2026-01-01") },
  { id: "video-room", name: "Video Room", description: "Video hangout / streaming", icon: "📹", category: "fun", type: "video", restrictedRoleIds: [], position: 20, createdAt: Date.parse("2026-01-01") },
  { id: "random", name: "Random", description: "Off-topic chat and fun stuff", icon: "🎉", category: "fun", type: "text", restrictedRoleIds: [], position: 30, createdAt: Date.parse("2026-01-01") },
  { id: "recipes", name: "Recipes", description: "Share your favorite recipes", icon: "🍳", category: "fun", type: "text", restrictedRoleIds: [], position: 40, createdAt: Date.parse("2026-01-01") },
  { id: "music", name: "Music", description: "What are you listening to?", icon: "🎵", category: "fun", type: "text", restrictedRoleIds: [], position: 50, createdAt: Date.parse("2026-01-01") },
];

interface ChannelsState {
  channels: RichChannel[];
  createChannel: (
    input: Omit<RichChannel, "id" | "createdAt" | "position"> & {
      id?: string;
      position?: number;
    },
  ) => RichChannel;
  updateChannel: (id: string, patch: Partial<RichChannel>) => void;
  deleteChannel: (id: string, hard?: boolean) => void;
  /**
   * Move a channel up/down within its category. Swaps positions with
   * the adjacent channel; no-op if the channel is already at the
   * edge.
   */
  moveChannel: (id: string, direction: "up" | "down") => void;
  /**
   * Move a channel to the very top or bottom of its category. Useful
   * for "pin to top" workflows.
   */
  moveChannelToEdge: (id: string, edge: "top" | "bottom") => void;
  /**
   * Drop a channel at a specific index inside a (possibly different)
   * category. Used by the drag-and-drop sidebar reorder. Renumbers
   * the affected category to clean 10/20/30/... positions so future
   * inserts are stable.
   *
   * If `targetIndex` is past the end of the destination category, the
   * channel is appended.
   */
  moveChannelTo: (
    id: string,
    targetCategory: RichChannel["category"],
    targetIndex: number,
  ) => void;
  reseedDefaults: () => void;
}

/* ------------------------------------------------------------------ */
/* Firestore persistence                                               */
/* ------------------------------------------------------------------ */

async function writeChannelsToFirestore(channels: RichChannel[]): Promise<void> {
  if (useSupabaseBackend) {
    await writeChannelsToSupabase(channels);
    return;
  }
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(doc(db, "config", "channels"), { channels }, { merge: false });
  } catch (err) {
    console.warn("[channels] Firestore write failed", err);
  }
}

async function seedChannelsIfEmpty(): Promise<void> {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  try {
    const snap = await getDoc(doc(db, "config", "channels"));
    if (!snap.exists()) {
      await setDoc(doc(db, "config", "channels"), { channels: DEFAULT_CHANNELS });
      console.debug("[channels] seeded Firestore with defaults");
      return;
    }
    // Merge missing defaults into the existing channel list so new
    // system channels (like #local) appear without a manual reseed.
    const data = snap.data() as { channels?: RichChannel[] };
    if (data.channels) {
      const byId = new Map(data.channels.map((c) => [c.id, c]));
      let added = false;
      for (const def of DEFAULT_CHANNELS) {
        if (!byId.has(def.id)) {
          byId.set(def.id, def);
          added = true;
        }
      }
      if (added) {
        const merged = Array.from(byId.values());
        await setDoc(doc(db, "config", "channels"), { channels: merged });
        console.debug("[channels] merged missing defaults into Firestore");
      }
    }
  } catch (err) {
    console.warn("[channels] seed check failed", err);
  }
}

function generateId(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const stamp = Date.now().toString(36).slice(-4);
  return slug ? `${slug}-${stamp}` : `ch-${stamp}`;
}

/**
 * Highest existing position in the given category, or 0 if none.
 * Used for both "append a new channel at the end" and the
 * "moveChannelToEdge" bottom case.
 */
function maxPosition(
  channels: RichChannel[],
  category: RichChannel["category"],
): number {
  return channels
    .filter((c) => c.category === category)
    .reduce((max, c) => Math.max(max, c.position ?? 0), 0);
}

export const useChannels = create<ChannelsState>()(
  persist(
    (set, _get) => ({
      channels: DEFAULT_CHANNELS,

      createChannel: (input) => {
        const newPosition =
          input.position ??
          // default: append to the end of the category, spaced by 10
          maxPosition(DEFAULT_CHANNELS, input.category) + 10;
        const next: RichChannel = {
          id: input.id ?? generateId(input.name),
          name: input.name,
          description: input.description,
          icon: input.icon || "#",
          category: input.category,
          type: input.type,
          restrictedRoleIds: input.restrictedRoleIds ?? [],
          position: newPosition,
          createdAt: Date.now(),
          archived: false,
          createdBy: input.createdBy,
          geoLocations: input.geoLocations,
          geoRadiusMiles: input.geoRadiusMiles,
          isGeoChannel: input.isGeoChannel,
        };
        set((s) => ({
          channels: [
            ...s.channels,
            // recompute position against the live store so we don't
            // collide with a channel the admin already added.
            { ...next, position: input.position ?? maxPosition(s.channels, input.category) + 10 },
          ],
        }));
        return next;
      },

      updateChannel: (id, patch) => {
        set((s) => ({
          channels: s.channels.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }));
      },

      deleteChannel: (id, hard = false) => {
        if (hard) {
          set((s) => ({
            channels: s.channels.filter((c) => c.id !== id),
          }));
          // Deletions are explicit + single-id. The full-list write-through is
          // upsert-only (it never prunes), so a hard delete must remove the row
          // directly. (Firebase replaces the whole config doc, so its
          // write-through already drops it.)
          if (useSupabaseBackend) void deleteChannelFromSupabase(id);
        } else {
          set((s) => ({
            channels: s.channels.map((c) =>
              c.id === id ? { ...c, archived: true } : c,
            ),
          }));
        }
      },

      moveChannel: (id, direction) => {
        set((s) => {
          const target = s.channels.find((c) => c.id === id);
          if (!target) return s;
          const siblings = s.channels
            .filter((c) => c.category === target.category && !c.archived)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          const idx = siblings.findIndex((c) => c.id === id);
          if (idx === -1) return s;
          const swapIdx = direction === "up" ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= siblings.length) return s;
          const other = siblings[swapIdx];
          const targetPos = target.position ?? 0;
          const otherPos = other.position ?? 0;
          return {
            channels: s.channels.map((c) => {
              if (c.id === target.id) return { ...c, position: otherPos };
              if (c.id === other.id) return { ...c, position: targetPos };
              return c;
            }),
          };
        });
      },

      moveChannelToEdge: (id, edge) => {
        set((s) => {
          const target = s.channels.find((c) => c.id === id);
          if (!target) return s;
          const siblings = s.channels
            .filter(
              (c) =>
                c.category === target.category && !c.archived && c.id !== id,
            )
            .map((c) => c.position ?? 0);
          if (siblings.length === 0) return s;
          const newPos =
            edge === "top"
              ? Math.min(...siblings) - 10
              : Math.max(...siblings) + 10;
          return {
            channels: s.channels.map((c) =>
              c.id === id ? { ...c, position: newPos } : c,
            ),
          };
        });
      },

      moveChannelTo: (id, targetCategory, targetIndex) => {
        set((s) => {
          const moving = s.channels.find((c) => c.id === id);
          if (!moving) return s;
          // Pull every non-archived channel in the destination category
          // EXCEPT the one being dragged, sorted by current position.
          const dest = s.channels
            .filter(
              (c) =>
                c.category === targetCategory &&
                !c.archived &&
                c.id !== id,
            )
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          const clampedIndex = Math.max(0, Math.min(targetIndex, dest.length));
          // Splice the moving channel into its new slot.
          const next = [...dest];
          next.splice(clampedIndex, 0, moving);
          // Renumber to clean 10/20/30 spacing so subsequent edits
          // don't slowly drift toward integer overflow.
          const positionById = new Map<string, number>();
          next.forEach((c, i) => positionById.set(c.id, (i + 1) * 10));
          return {
            channels: s.channels.map((c) => {
              if (c.id === id) {
                return {
                  ...c,
                  category: targetCategory,
                  position: positionById.get(c.id) ?? c.position,
                };
              }
              const p = positionById.get(c.id);
              if (p !== undefined) return { ...c, position: p };
              return c;
            }),
          };
        });
      },

      reseedDefaults: () => {
        set((s) => {
          const byId = new Map(s.channels.map((c) => [c.id, c]));
          for (const def of DEFAULT_CHANNELS) {
            if (!byId.has(def.id)) byId.set(def.id, def);
          }
          return { channels: Array.from(byId.values()) };
        });
      },
    }),
    {
      name: "ayms-channels",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Migrate v1 -> v2: assign positions to any persisted channel
      // that doesn't have one yet. Keeps existing admin edits intact.
      migrate: (persisted, fromVersion) => {
        const state = persisted as { channels?: RichChannel[] } | undefined;
        if (!state?.channels) return persisted as ChannelsState;
        if (fromVersion >= 2) return state as ChannelsState;
        const byCategory: Record<string, number> = {};
        const channels = state.channels.map((c) => {
          if (typeof c.position === "number") return c;
          // Increment the per-category counter so we get a stable
          // ordering matching the original array order.
          byCategory[c.category] = (byCategory[c.category] ?? 0) + 10;
          return { ...c, position: byCategory[c.category] };
        });
        return { ...state, channels } as ChannelsState;
      },
    },
  ),
);

// Auto-write whenever channels change, then keep the realtime echo from
// clobbering the optimistic local list while that write is in flight.
//
// The race this fixes ("create a channel, it appears, then disappears"):
// a mutation updates local state instantly, but the cloud write was
// debounced 300ms; meanwhile a stale realtime/poll snapshot (which doesn't
// yet contain the new channel) could replace the whole list and wipe it.
// We now write fast (120ms) and ignore incoming snapshots until our own
// write is acknowledged, so what the admin does and what's stored stay in
// lockstep with near-zero perceived latency.
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let channelsSyncListenerStarted = false;
let applyingRemote = false;
let pendingWrites = 0;
let lastLocalEditAt = 0;
// Gate write-through until we've seen the backend's current channel list once.
// Otherwise a freshly-hydrated browser (localStorage may hold a stale/partial
// list, e.g. just the defaults) would write that list before learning the
// server's truth — resurrecting deleted channels or overwriting newer edits.
let remoteSynced = false;
function markChannelsSynced() {
  remoteSynced = true;
}

useChannels.subscribe((state) => {
  if (!isFirebaseConfigured && !useSupabaseBackend) return;
  // Don't echo a snapshot we just applied back to the backend.
  if (applyingRemote) return;
  // Hold writes until the first real snapshot arrives (see remoteSynced).
  if (!remoteSynced) return;
  // Mark the edit immediately (before the debounce) so a snapshot landing in
  // the gap before the write fires can't clobber the optimistic change.
  lastLocalEditAt = Date.now();
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    pendingWrites += 1;
    void writeChannelsToFirestore(state.channels).finally(() => {
      // Brief hold after the write so its own realtime echo lands while we
      // still trust local state, then resume accepting remote snapshots.
      setTimeout(() => {
        pendingWrites = Math.max(0, pendingWrites - 1);
      }, 600);
    });
  }, 120);
});

const setChannelsState = (channels: RichChannel[]) => {
  // A local write is in flight (or just settled), or the admin edited within
  // the last moment — keep the optimistic list so a stale snapshot can't make
  // a fresh channel vanish.
  if (pendingWrites > 0) return;
  if (Date.now() - lastLocalEditAt < 1500) return;
  applyingRemote = true;
  try {
    useChannels.setState({ channels });
  } finally {
    applyingRemote = false;
  }
};

export function useChannelsSync(): void {
  return useSupabaseBackend
    ? useChannelsSyncSupabase(setChannelsState, DEFAULT_CHANNELS, markChannelsSynced)
    : useChannelsSyncFirebase();
}

function useChannelsSyncFirebase(): void {
  useEffect(() => {
    if (!isFirebaseConfigured || channelsSyncListenerStarted) return;
    channelsSyncListenerStarted = true;
    const db = getDb();
    if (!db) return;

    void seedChannelsIfEmpty();

    const unsub = onSnapshot(
      doc(db, "config", "channels"),
      (snap) => {
        // Heard the server (even an empty/missing doc) — unblock write-through.
        markChannelsSynced();
        if (!snap.exists()) return;
        const data = snap.data() as { channels?: RichChannel[] };
        if (data.channels) {
          setChannelsState(data.channels);
        }
      },
      (err) => console.warn("[channels] snapshot failed", err),
    );

    return () => {
      unsub();
      channelsSyncListenerStarted = false;
    };
  }, []);
}

/**
 * Returns true if the user can view this channel given their role
 * memberships. Anyone gets through if restrictedRoleIds is empty.
 */
export function canViewChannel(
  channel: Pick<RichChannel, "restrictedRoleIds">,
  userRoleIds: string[],
): boolean {
  if (!channel.restrictedRoleIds || channel.restrictedRoleIds.length === 0) {
    return true;
  }
  for (const r of userRoleIds) {
    if (channel.restrictedRoleIds.includes(r)) return true;
  }
  return false;
}

/**
 * Hook: list of channels visible to the current user (filters out
 * archived + role-restricted that don't match), sorted by position
 * within each category so the admin's order is honored.
 */
export function useVisibleChannels(currentUserId?: string): RichChannel[] {
  const channels = useChannels((s) => s.channels);
  const userRoles = useRoles((s) => s.userRoles);
  return useMemo(() => {
    const myRoles = currentUserId ? (userRoles[currentUserId] ?? []) : [];
    return channels
      .filter((c) => !c.archived)
      .filter((c) => canViewChannel(c, myRoles))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [channels, userRoles, currentUserId]);
}
