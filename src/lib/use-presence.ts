"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  doc,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend, getSupabase } from "./supabase";
import { useAuth, type User } from "./store";

/**
 * Presence heartbeat write to Supabase (public.users). A targeted
 * UPDATE of just the presence columns — never the whole profile, so a
 * heartbeat can't clobber a concurrent profile edit. Only when no row
 * exists yet (first heartbeat ever) do we INSERT the base profile, and
 * even then WITHOUT `role`: the users_role_guard trigger blocks
 * client-side role writes (notably role='admin' — the admin row is
 * seeded server-side by /api/auth/login via the service role).
 */
async function writePresenceSupabase(
  user: User,
  status: PresenceStatus,
  override: PresenceOverride,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const presence = {
    status,
    manual_override: override !== null,
    last_active_at: new Date().toISOString(),
  };
  try {
    const { data, error } = await sb
      .from("users")
      .update(presence)
      .eq("id", user.id)
      .select("id");
    if (error) throw error;
    if (data && data.length > 0) return;
    await sb.from("users").insert({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? "",
      bio: user.bio ?? "",
      location: user.location ?? "",
      joined_date: user.joinedDate,
      name_display: user.nameDisplay ?? "full",
      ...presence,
    });
  } catch (e) {
    console.warn("[presence:sb] heartbeat failed", e);
  }
}

async function writeOfflineSupabase(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb
      .from("users")
      .update({ status: "offline", last_active_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    /* best-effort */
  }
}

/**
 * Discord-style presence states.
 *  - online:  active recently (and tab is open).
 *  - away:    tab open, but the user's been idle for a while (or manually set).
 *  - offline: tab is closed / user signed out / manually invisible.
 */
export type PresenceStatus = "online" | "away" | "offline";

/**
 * What the user explicitly chose from the status menu, or null when
 * we should auto-detect.
 */
export type PresenceOverride = PresenceStatus | null;

/**
 * Heartbeat cadence + thresholds. Intentionally small constants so
 * the math everywhere uses the same numbers.
 */
export const PRESENCE = {
  /** How often the active tab pushes a heartbeat. */
  HEARTBEAT_MS: 30_000,
  /** Idle time after which we auto-mark the user "away". */
  AWAY_AFTER_MS: 15 * 60_000,
  /**
   * If a user's last heartbeat is older than this, viewers consider
   * them offline regardless of the published status. Two missed
   * heartbeats with a small buffer.
   */
  OFFLINE_AFTER_MS: 90_000,
} as const;

interface PresenceState {
  /**
   * What the local user explicitly chose. null = auto.
   * Persisted so reload preserves "set as away/invisible".
   */
  override: PresenceOverride;
  setOverride: (next: PresenceOverride) => void;
}

export const usePresenceStore = create<PresenceState>()(
  persist(
    (set) => ({
      override: null,
      setOverride: (next) => set({ override: next }),
    }),
    {
      name: "ayms-presence-override",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Compute the effective status for a user record sourced from the
 * Firestore `users` collection. Two-step: respect manual override,
 * but force "offline" if the heartbeat is too stale (the override is
 * meaningless if their tab has been closed for an hour).
 */
export function computeDisplayStatus(record: {
  status?: PresenceStatus;
  lastActiveAt?: Timestamp | { toMillis(): number } | null;
  manualOverride?: boolean;
}): PresenceStatus {
  const last = record.lastActiveAt;
  const lastMs =
    last && typeof (last as { toMillis?: () => number }).toMillis === "function"
      ? (last as { toMillis: () => number }).toMillis()
      : null;
  const ageMs = lastMs ? Date.now() - lastMs : Infinity;

  // Manual "appear offline" wins even if the user is actively typing.
  if (record.manualOverride && record.status === "offline") return "offline";

  // No recent heartbeat -> tab is closed.
  if (ageMs > PRESENCE.OFFLINE_AFTER_MS) return "offline";

  return record.status ?? "online";
}

/**
 * Build the document payload for a heartbeat write. Extracted so the
 * heartbeat AND the initial-mount upsert use the same shape.
 */
function buildPresenceDoc(
  user: User,
  status: PresenceStatus,
  override: PresenceOverride,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
    role: user.role,
    joinedDate: user.joinedDate,
    nameDisplay: user.nameDisplay ?? "full",
    status,
    manualOverride: override !== null,
    lastActiveAt: serverTimestamp(),
  };
}

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

/**
 * Mounted once at the top of the community area. Tracks local user
 * activity, pushes a heartbeat every 30s to Firestore, auto-sets
 * "away" after 15 min idle, and respects the manual override stored
 * in usePresenceStore.
 *
 * Quietly no-ops when Firebase isn't configured - the chat already
 * does the same thing, so dev environments without Firebase still
 * work end-to-end.
 */
export function usePresenceHeartbeat(): void {
  const user = useAuth((s) => s.user);
  const override = usePresenceStore((s) => s.override);
  // Refs so the heartbeat closure always sees the latest values
  // without having to re-create the interval.
  const overrideRef = useRef<PresenceOverride>(override);
  const lastActivityRef = useRef<number>(Date.now());
  // Cache of the most recent payload we wrote, used by the unload
  // best-effort offline write.
  const lastUserRef = useRef<User | null>(user);

  useEffect(() => {
    overrideRef.current = override;
  }, [override]);

  useEffect(() => {
    lastUserRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!isFirebaseConfigured && !useSupabaseBackend) return;

    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    function deriveAutoStatus(): PresenceStatus {
      if (typeof document !== "undefined" && document.hidden) return "away";
      const idleMs = Date.now() - lastActivityRef.current;
      return idleMs > PRESENCE.AWAY_AFTER_MS ? "away" : "online";
    }

    async function pushHeartbeat() {
      const u = lastUserRef.current;
      if (!u) return;
      const ov = overrideRef.current;
      const status: PresenceStatus = ov ?? deriveAutoStatus();
      if (useSupabaseBackend) {
        await writePresenceSupabase(u, status, ov);
        return;
      }
      const db = getDb();
      if (!db) return;
      try {
        await setDoc(doc(db, "users", u.id), buildPresenceDoc(u, status, ov), {
          merge: true,
        });
      } catch (e) {
        // Don't tear down the loop on transient permission / network blips.
        console.warn("[presence] heartbeat failed", e);
      }
    }

    // Push immediately so the user shows online right away, then on a cadence.
    void pushHeartbeat();
    const iv = setInterval(pushHeartbeat, PRESENCE.HEARTBEAT_MS);

    // Best-effort offline write when the tab closes. We can't await
    // anything here so this is a fire-and-forget setDoc.
    const onUnload = () => {
      const u = lastUserRef.current;
      if (!u) return;
      if (useSupabaseBackend) {
        void writeOfflineSupabase(u.id);
        return;
      }
      const db = getDb();
      if (!db) return;
      void setDoc(
        doc(db, "users", u.id),
        {
          status: "offline" as PresenceStatus,
          // Don't flip manualOverride - if they set themselves to
          // away explicitly, leave that alone for next session.
          lastActiveAt: serverTimestamp(),
        },
        { merge: true },
      );
    };
    window.addEventListener("beforeunload", onUnload);

    // Kick a heartbeat when the tab becomes visible again so the
    // green dot reappears without waiting for the next interval tick.
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastActivityRef.current = Date.now();
        void pushHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(iv);
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);
}

/**
 * Convenience: the current user's effective status for the UI badge.
 * Computed locally so it updates instantly when the user changes the
 * override (no need to wait for the Firestore round-trip).
 */
export function useMyStatus(): PresenceStatus {
  const override = usePresenceStore((s) => s.override);
  const user = useAuth((s) => s.user);
  if (!user) return "offline";
  return override ?? "online";
}
