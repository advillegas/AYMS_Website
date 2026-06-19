"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";
import { mapUserRowToDoc, type SupabaseUserRow } from "./supabase-user-map";
import { useAuth, useCommunity, type User } from "./store";
import {
  computeDisplayStatus,
  type PresenceStatus,
  PRESENCE,
} from "./use-presence";

/**
 * A community member enriched with live presence info. The base User
 * fields (name, avatar, bio, etc.) are merged from whichever source
 * has the freshest data: Firestore > local registry > MOCK_USERS.
 */
export interface MemberWithStatus extends User {
  status: PresenceStatus;
  /** Heartbeat ms-since-epoch, or null if we've never seen one. */
  lastActiveAt: number | null;
  /** True when the data came from a live Firestore subscription. */
  isLive: boolean;
}

interface FirestoreUserDoc {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate?: string;
  role?: User["role"];
  nameDisplay?: User["nameDisplay"];
  dmPrivacy?: User["dmPrivacy"];
  pronouns?: string;
  headline?: string;
  coverPhoto?: string;
  bioLong?: string;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  interests?: string[];
  languages?: string[];
  topFriendIds?: string[];
  galleryPhotos?: string[];
  emailVisibility?: User["emailVisibility"];
  profileVisibility?: User["profileVisibility"];
  geoLat?: number;
  geoLng?: number;
  manualLocations?: Array<{ label: string; lat: number; lng: number }>;
  localRadiusMiles?: number;
  eventRadiusMiles?: number;
  localChatVisibility?: "everyone" | "radius";
  status?: PresenceStatus;
  manualOverride?: boolean;
  lastActiveAt?: Timestamp | null;
}

/* ------------------------------------------------------------------ */
/* Singleton subscription                                              */
/* ------------------------------------------------------------------ */
/**
 * IMPORTANT: this used to instantiate a fresh Firestore listener +
 * 30-second interval inside every component that called
 * `useCommunityMembers` or `useMemberStatus`. With one of those hooks
 * mounted per chat message + per profile popover + per member row,
 * a busy chat could open 30+ duplicate listeners and drive the tab
 * to OOM (which presented as "instant page crash" when something
 * else allocated, e.g. opening a portal-rendered dropdown).
 *
 * The fix is a module-level singleton: ONE Firestore listener and
 * ONE interval, refcounted by mounted React subscribers via
 * `useSyncExternalStore`.
 */

interface CommunityMembersSnapshot {
  /** Firestore docs by id. Empty until we get the first snapshot. */
  firebaseDocs: Record<string, FirestoreUserDoc>;
  /** Increments on the periodic tick so memos that depend on
   *  "time since last heartbeat" recompute. */
  tick: number;
  loading: boolean;
  /** True once we've subscribed to Firestore at least once. */
  initialized: boolean;
}

const BACKEND_LIVE = isFirebaseConfigured || useSupabaseBackend;

let snapshot: CommunityMembersSnapshot = {
  firebaseDocs: {},
  tick: 0,
  loading: BACKEND_LIVE,
  initialized: false,
};

const listeners = new Set<() => void>();
let unsubFirestore: (() => void) | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let refCount = 0;

function emit() {
  for (const l of listeners) l();
}

function startGlobalSubscription() {
  if (unsubFirestore) return;
  if (typeof window === "undefined") return; // SSR no-op

  // Periodic "freshness" tick - drives the online -> away ->
  // offline transition in the UI even when no Firestore event fires.
  intervalId = setInterval(() => {
    snapshot = { ...snapshot, tick: snapshot.tick + 1 };
    emit();
  }, PRESENCE.HEARTBEAT_MS);

  // Supabase path: subscribe to the users table, map rows into the
  // same FirestoreUserDoc shape the merge logic expects.
  if (useSupabaseBackend) {
    unsubFirestore = subscribeQuery<SupabaseUserRow>(
      "users",
      (sb) => sb.from("users").select("*").limit(1000),
      (rows) => {
        const next: Record<string, FirestoreUserDoc> = {};
        for (const r of rows) {
          next[r.id] = mapUserRowToDoc(r) as unknown as FirestoreUserDoc;
        }
        snapshot = {
          ...snapshot,
          firebaseDocs: next,
          loading: false,
          initialized: true,
        };
        emit();
      },
      (msg) => {
        console.warn("[members:sb] users query failed", msg);
        snapshot = { ...snapshot, loading: false, initialized: true };
        emit();
      },
    );
    return;
  }

  if (!isFirebaseConfigured) {
    snapshot = { ...snapshot, loading: false, initialized: true };
    emit();
    return;
  }
  const db = getDb();
  if (!db) {
    snapshot = { ...snapshot, loading: false, initialized: true };
    emit();
    return;
  }
  const col = collection(db, "users");
  unsubFirestore = onSnapshot(
    col,
    (snap) => {
      const next: Record<string, FirestoreUserDoc> = {};
      for (const d of snap.docs) {
        const data = d.data() as FirestoreUserDoc;
        next[d.id] = { ...data, id: d.id };
      }
      snapshot = {
        ...snapshot,
        firebaseDocs: next,
        loading: false,
        initialized: true,
      };
      emit();
    },
    (err) => {
      console.warn("[members] users snapshot failed", err);
      snapshot = { ...snapshot, loading: false, initialized: true };
      emit();
    },
  );
}

function stopGlobalSubscription() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (unsubFirestore) {
    unsubFirestore();
    unsubFirestore = null;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  refCount += 1;
  if (refCount === 1) startGlobalSubscription();
  return () => {
    listeners.delete(onChange);
    refCount -= 1;
    if (refCount === 0) {
      // Defer teardown a tick to avoid thrash when the last subscriber
      // unmounts and another mounts in the same render pass.
      setTimeout(() => {
        if (refCount === 0) stopGlobalSubscription();
      }, 250);
    }
  };
}

function getServerSnapshot(): CommunityMembersSnapshot {
  return snapshot;
}

function getSnapshot(): CommunityMembersSnapshot {
  return snapshot;
}

function useMembersSnapshot(): CommunityMembersSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ------------------------------------------------------------------ */
/* Public hooks                                                        */
/* ------------------------------------------------------------------ */

/**
 * Subscribe to the Firestore `users` collection (singleton) and
 * return a stable, merged list of community members enriched with
 * presence info.
 *
 * Three layers, last writer wins:
 *  1. Static MOCK_USERS  (so the UI always has *somebody* to show)
 *  2. Locally-registered users (auth.registry)
 *  3. Firestore `users` (the live, cross-device source of truth)
 *
 * The current user is always included even when their Firestore doc
 * hasn't been written yet (e.g. brand-new login, before the first
 * heartbeat has flushed).
 */
export function useCommunityMembers(): {
  members: MemberWithStatus[];
  online: MemberWithStatus[];
  away: MemberWithStatus[];
  offline: MemberWithStatus[];
  isLive: boolean;
  loading: boolean;
} {
  const mockMembers = useCommunity((s) => s.members);
  const registry = useAuth((s) => s.registry);
  const currentUser = useAuth((s) => s.user);
  const { firebaseDocs, tick, loading } = useMembersSnapshot();

  const members = useMemo<MemberWithStatus[]>(() => {
    // Reference tick so the memo recomputes on the timer tick. The
    // value itself is irrelevant - we just need a stable dependency
    // that changes every 30s for the status freshness.
    void tick;

    const byId = new Map<string, MemberWithStatus>();

    function upsert(
      base: User,
      fb?: FirestoreUserDoc,
      isLive = false,
      preferBase = false,
    ) {
      // For the signed-in user, the auth store holds the freshest edits (it
      // updates instantly on save, before the DB row echoes back over
      // realtime), so prefer it over the DB snapshot for self-editable fields.
      const pick = <T,>(b: T | undefined, f: T | undefined): T | undefined =>
        preferBase ? (b ?? f) : (f ?? b);
      const merged: User = {
        ...base,
        name: pick(base.name, fb?.name) ?? base.name,
        avatar: pick(base.avatar, fb?.avatar) ?? base.avatar,
        bio: pick(base.bio, fb?.bio) ?? base.bio,
        location: pick(base.location, fb?.location) ?? base.location,
        role: fb?.role ?? base.role,
        joinedDate: fb?.joinedDate ?? base.joinedDate,
        email: fb?.email ?? base.email,
        nameDisplay: pick(base.nameDisplay, fb?.nameDisplay),
        dmPrivacy: pick(base.dmPrivacy, fb?.dmPrivacy),
        pronouns: pick(base.pronouns, fb?.pronouns),
        headline: pick(base.headline, fb?.headline),
        coverPhoto: pick(base.coverPhoto, fb?.coverPhoto),
        bioLong: pick(base.bioLong, fb?.bioLong),
        instagram: pick(base.instagram, fb?.instagram),
        tiktok: pick(base.tiktok, fb?.tiktok),
        twitter: pick(base.twitter, fb?.twitter),
        linkedin: pick(base.linkedin, fb?.linkedin),
        website: pick(base.website, fb?.website),
        interests: pick(base.interests, fb?.interests),
        languages: pick(base.languages, fb?.languages),
        topFriendIds: pick(base.topFriendIds, fb?.topFriendIds),
        galleryPhotos: pick(base.galleryPhotos, fb?.galleryPhotos),
        emailVisibility: pick(base.emailVisibility, fb?.emailVisibility),
        profileVisibility: pick(base.profileVisibility, fb?.profileVisibility),
        geoLat: fb?.geoLat ?? base.geoLat,
        geoLng: fb?.geoLng ?? base.geoLng,
        manualLocations: pick(base.manualLocations, fb?.manualLocations),
        localRadiusMiles: pick(base.localRadiusMiles, fb?.localRadiusMiles),
        eventRadiusMiles: pick(base.eventRadiusMiles, fb?.eventRadiusMiles),
        localChatVisibility: pick(base.localChatVisibility, fb?.localChatVisibility),
      };
      const status = fb
        ? computeDisplayStatus({
            status: fb.status,
            lastActiveAt: fb.lastActiveAt ?? null,
            manualOverride: fb.manualOverride,
          })
        : "offline";
      const lastActiveAt =
        fb?.lastActiveAt && typeof fb.lastActiveAt.toMillis === "function"
          ? fb.lastActiveAt.toMillis()
          : null;
      byId.set(base.id, {
        ...merged,
        status,
        lastActiveAt,
        isLive,
      });
    }

    for (const m of mockMembers) {
      upsert(m, firebaseDocs[m.id], Boolean(firebaseDocs[m.id]));
    }
    for (const r of registry) {
      const { passwordHash: _ph, ...rest } = r;
      void _ph;
      upsert(rest, firebaseDocs[r.id], Boolean(firebaseDocs[r.id]));
    }
    if (currentUser) {
      upsert(
        currentUser,
        firebaseDocs[currentUser.id],
        Boolean(firebaseDocs[currentUser.id]),
        true, // prefer the auth store for my own freshest edits
      );
    }
    // Anyone who shows up *only* in Firestore (e.g. a member that
    // logged in from another device and never made it into our local
    // registry).
    for (const [id, fb] of Object.entries(firebaseDocs)) {
      if (byId.has(id)) continue;
      if (!fb.name) continue;
      upsert(
        {
          id,
          name: fb.name,
          email: fb.email ?? "",
          avatar: fb.avatar ?? "",
          bio: fb.bio ?? "",
          location: fb.location ?? "",
          joinedDate: fb.joinedDate ?? new Date().toISOString().split("T")[0],
          role: fb.role ?? "amiga",
          nameDisplay: fb.nameDisplay ?? "full",
          dmPrivacy: fb.dmPrivacy ?? "anyone",
        },
        fb,
        true,
      );
    }

    // Dedupe by email, preferring the entry whose id is a real
    // Firebase UID (the ones that actually have a Firestore /users
    // doc - that's the only id another user's DM query will look up
    // via array-contains). Without this, mock-seed and registry
    // entries shadow the live Firebase user under a fake id, and
    // DMs sent against the fake id never reach the recipient.
    const dedupedByEmail = new Map<string, MemberWithStatus>();
    const noEmail: MemberWithStatus[] = [];
    for (const m of byId.values()) {
      const key = (m.email || "").trim().toLowerCase();
      if (!key) {
        noEmail.push(m);
        continue;
      }
      const existing = dedupedByEmail.get(key);
      if (!existing) {
        dedupedByEmail.set(key, m);
        continue;
      }
      // Pick whichever one is "live" (came from the Firestore users
      // collection). Tie-break by online status so we still show the
      // freshest presence.
      const pickNew =
        (m.isLive && !existing.isLive) ||
        (m.isLive === existing.isLive && m.status === "online" && existing.status !== "online");
      if (pickNew) dedupedByEmail.set(key, m);
    }

    return [...dedupedByEmail.values(), ...noEmail].sort((a, b) => {
      // online first, away second, offline last - and within a bucket
      // sort by name for a stable display.
      const order: Record<PresenceStatus, number> = {
        online: 0,
        away: 1,
        offline: 2,
      };
      const diff = order[a.status] - order[b.status];
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [mockMembers, registry, currentUser, firebaseDocs, tick]);

  const buckets = useMemo(() => {
    const online: MemberWithStatus[] = [];
    const away: MemberWithStatus[] = [];
    const offline: MemberWithStatus[] = [];
    for (const m of members) {
      if (m.status === "online") online.push(m);
      else if (m.status === "away") away.push(m);
      else offline.push(m);
    }
    return { online, away, offline };
  }, [members]);

  return {
    members,
    online: buckets.online,
    away: buckets.away,
    offline: buckets.offline,
    isLive: BACKEND_LIVE,
    loading,
  };
}

/**
 * Convenience hook: get a single member's live status. Used by the
 * chat-message avatar to render the colored dot.
 *
 * Hot path - this is mounted PER chat message. Internally subscribes
 * to the singleton (no extra Firestore listener), and only re-renders
 * when *this user's* doc changes (via tick or doc swap).
 */
export function useMemberStatus(userId: string | undefined | null): {
  status: PresenceStatus;
  isLive: boolean;
} {
  // Subscribe to the singleton snapshot but only return THIS user's
  // status. We don't compute the full member list here so we avoid
  // the merge work per message.
  const { firebaseDocs, tick } = useMembersSnapshot();
  return useMemo(() => {
    void tick;
    if (!userId) {
      return { status: "offline" as PresenceStatus, isLive: BACKEND_LIVE };
    }
    const fb = firebaseDocs[userId];
    if (!fb) {
      return { status: "offline" as PresenceStatus, isLive: BACKEND_LIVE };
    }
    const status = computeDisplayStatus({
      status: fb.status,
      lastActiveAt: fb.lastActiveAt ?? null,
      manualOverride: fb.manualOverride,
    });
    return { status, isLive: BACKEND_LIVE };
  }, [userId, firebaseDocs, tick]);
}

/**
 * Eagerly start the global subscription. Call once at the top of the
 * community shell so the listener is ready before any consumer hook
 * mounts. (Optional - subscriber refcounting will start it on first
 * use either way.)
 */
export function usePrimeCommunityMembers(): void {
  useEffect(() => {
    const unsub = subscribe(() => {});
    return unsub;
  }, []);
}

