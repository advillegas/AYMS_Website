"use client";

/**
 * Generic RSVP hook backed by a Firestore subcollection at
 * `{events|meetups}/{id}/rsvps/{uid}`. One document per member (doc id
 * == uid) makes the toggle idempotent: tapping "Going" twice never
 * stacks duplicate RSVPs, it just flips the stored status.
 *
 * Shape: { userId, userName, userAvatar, status, createdAt }.
 *
 * Used by both the calendar/public event RSVP affordance and the
 * member-created meetup attendee list, so the same realtime list of
 * who's coming powers events and meetups alike.
 *
 * When Firestore isn't configured every mutation is a graceful no-op
 * and the list stays empty — mirroring use-events.ts / use-event-comments.ts.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getCurrentUid, getDb, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import { useMyRsvpRefsSupabase, useRsvpsSupabase } from "./use-rsvps-supabase";
import { useAuth } from "./store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type RsvpTargetType = "event" | "meetup";
export type RsvpStatus = "going" | "interested";

export interface Rsvp {
  userId: string;
  userName: string;
  userAvatar?: string;
  status: RsvpStatus;
  /** ISO timestamp; "" until the serverTimestamp resolves. */
  createdAt: string;
}

interface RsvpDoc {
  userId?: string;
  userName?: string;
  userAvatar?: string | null;
  status?: RsvpStatus;
  createdAt?: Timestamp;
}

/** Map RsvpTargetType → its Firestore parent collection name. */
function parentCollection(type: RsvpTargetType): string {
  return type === "meetup" ? "meetups" : "events";
}

function tsToIso(ts: Timestamp | undefined): string {
  if (!ts) return "";
  try {
    return ts.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToRsvp(d: QueryDocumentSnapshot<DocumentData, DocumentData>): Rsvp {
  const data = d.data() as RsvpDoc;
  return {
    userId: data.userId ?? d.id,
    userName: data.userName ?? "Amiga",
    userAvatar: data.userAvatar ?? undefined,
    status: data.status === "interested" ? "interested" : "going",
    createdAt: tsToIso(data.createdAt),
  };
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export interface UseRsvpsResult {
  rsvps: Rsvp[];
  going: Rsvp[];
  interested: Rsvp[];
  goingCount: number;
  interestedCount: number;
  /** The current user's RSVP, or null if they haven't responded. */
  myRsvp: Rsvp | null;
  loading: boolean;
  isFirebase: boolean;
  /**
   * Set or flip the current user's RSVP. Passing the status they're
   * already on removes the RSVP (idempotent toggle). Returns the new
   * status, or null if it was cleared / the write failed.
   */
  toggle: (status: RsvpStatus) => Promise<RsvpStatus | null>;
  /** Explicitly clear the current user's RSVP. */
  remove: () => Promise<boolean>;
}

export function useRsvps(
  targetType: RsvpTargetType,
  targetId: string | null | undefined,
): UseRsvpsResult {
  return useSupabaseBackend
    ? useRsvpsSupabase(targetType, targetId)
    : useRsvpsFirebase(targetType, targetId);
}

function useRsvpsFirebase(
  targetType: RsvpTargetType,
  targetId: string | null | undefined,
): UseRsvpsResult {
  const user = useAuth((s) => s.user);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetId || !isFirebaseConfigured) {
      setRsvps([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const parent = parentCollection(targetType);
    // The subcollection is already keyed by targetId, so the read is
    // bounded — no orderBy (sort client-side, house pattern).
    const unsub = onSnapshot(
      collection(db, parent, targetId, "rsvps"),
      (snap) => {
        const list = snap.docs
          .map(docToRsvp)
          .sort((a, b) => (a.createdAt || "￿").localeCompare(b.createdAt || "￿"));
        setRsvps(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[rsvps] snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [targetType, targetId]);

  const going = useMemo(() => rsvps.filter((r) => r.status === "going"), [rsvps]);
  const interested = useMemo(
    () => rsvps.filter((r) => r.status === "interested"),
    [rsvps],
  );

  // The rsvp doc is keyed by `request.auth.uid` (rule: isOwner(uid)), which
  // for the bridged admin session is the Firebase uid, not the store's
  // literal "admin". Match my own rsvp by that same effective uid so the
  // toggle reflects the correct state.
  const myRsvp = useMemo(() => {
    if (!user) return null;
    const uid = getCurrentUid() ?? user.id;
    return rsvps.find((r) => r.userId === uid) ?? null;
  }, [rsvps, user]);

  const toggle = useCallback(
    async (status: RsvpStatus): Promise<RsvpStatus | null> => {
      if (!targetId || !user || !isFirebaseConfigured) return null;
      const db = getDb();
      if (!db) return null;
      const parent = parentCollection(targetType);
      // Doc id MUST be the real Firebase uid to satisfy isOwner(uid).
      const uid = getCurrentUid() ?? user.id;
      const ref = doc(db, parent, targetId, "rsvps", uid);
      try {
        // Tapping the status you already hold clears the RSVP.
        if (myRsvp?.status === status) {
          await deleteDoc(ref);
          return null;
        }
        await setDoc(ref, {
          userId: uid,
          userName: user.name,
          userAvatar: user.avatar ?? null,
          status,
          createdAt: serverTimestamp(),
        });
        return status;
      } catch (err) {
        console.error("[rsvps] toggle failed", err);
        return null;
      }
    },
    [targetType, targetId, user, myRsvp],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!targetId || !user || !isFirebaseConfigured) return false;
    const db = getDb();
    if (!db) return false;
    const uid = getCurrentUid() ?? user.id;
    try {
      await deleteDoc(doc(db, parentCollection(targetType), targetId, "rsvps", uid));
      return true;
    } catch (err) {
      console.error("[rsvps] remove failed", err);
      return false;
    }
  }, [targetType, targetId, user]);

  return {
    rsvps,
    going,
    interested,
    goingCount: going.length,
    interestedCount: interested.length,
    myRsvp,
    loading,
    isFirebase: isFirebaseConfigured,
    toggle,
    remove,
  };
}

/* ------------------------------------------------------------------ */
/* Cross-target lookup (My Upcoming)                                   */
/* ------------------------------------------------------------------ */

export interface MyRsvpRef {
  targetType: RsvpTargetType;
  targetId: string;
  status: RsvpStatus;
  createdAt: string;
}

/**
 * Live list of every RSVP the current user has across a known set of
 * targets. Used by the "My Upcoming" page, which already has the event
 * + meetup lists loaded and just needs to know which the member joined.
 *
 * We read each target's own rsvp doc (one getDoc-equivalent listener
 * per id) rather than a collectionGroup query so no composite index or
 * extra security rule is required.
 */
export function useMyRsvpRefs(
  targets: Array<{ type: RsvpTargetType; id: string }>,
): { refs: MyRsvpRef[]; loading: boolean } {
  return useSupabaseBackend
    ? useMyRsvpRefsSupabase(targets)
    : useMyRsvpRefsFirebase(targets);
}

function useMyRsvpRefsFirebase(
  targets: Array<{ type: RsvpTargetType; id: string }>,
): { refs: MyRsvpRef[]; loading: boolean } {
  // Effective uid (Firebase uid for the bridged admin, store id otherwise)
  // so we read the same rsvp doc the toggle writes.
  const storeId = useAuth((s) => s.user?.id);
  const uid = getCurrentUid() ?? storeId;
  const [refs, setRefs] = useState<MyRsvpRef[]>([]);
  const [loading, setLoading] = useState(false);

  // Stable signature so the effect only re-subscribes when the actual
  // set of targets changes (not on every render's new array identity).
  const sig = useMemo(
    () => targets.map((t) => `${t.type}:${t.id}`).sort().join("|"),
    [targets],
  );

  useEffect(() => {
    if (!uid || !isFirebaseConfigured || targets.length === 0) {
      setRefs([]);
      return;
    }
    const db = getDb();
    if (!db) return;
    setLoading(true);

    const found = new Map<string, MyRsvpRef>();
    let settled = 0;
    const unsubs = targets.map((t) => {
      const parent = t.type === "meetup" ? "meetups" : "events";
      const key = `${t.type}:${t.id}`;
      return onSnapshot(
        doc(db, parent, t.id, "rsvps", uid),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as RsvpDoc;
            found.set(key, {
              targetType: t.type,
              targetId: t.id,
              status: data.status === "interested" ? "interested" : "going",
              createdAt: tsToIso(data.createdAt),
            });
          } else {
            found.delete(key);
          }
          setRefs(Array.from(found.values()));
          settled += 1;
          if (settled >= targets.length) setLoading(false);
        },
        () => {
          settled += 1;
          if (settled >= targets.length) setLoading(false);
        },
      );
    });
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, sig]);

  return { refs, loading };
}
