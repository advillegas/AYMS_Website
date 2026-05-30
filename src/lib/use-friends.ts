"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useAuth } from "./store";

/**
 * Friends graph.
 *
 * Firestore data model
 * --------------------
 *   friendships/{friendshipId}
 *     - participantIds: [a, b]   (sorted lexicographically)
 *     - requesterId: uid
 *     - recipientId: uid
 *     - status: "pending" | "accepted"
 *     - createdAt: Timestamp
 *     - acceptedAt?: Timestamp
 *
 * Friendship ids are deterministic ("friend_{lowerUid}_{higherUid}")
 * so a duplicate request from either side reuses the same document
 * and never creates duplicates.
 *
 * Production note: with the current open rules friendships are
 * world-writeable. Before public launch, harden with:
 *   match /friendships/{fid} {
 *     allow read, update, delete:
 *       if request.auth.uid in resource.data.participantIds;
 *     allow create: if request.auth.uid == request.resource.data.requesterId
 *                    && request.auth.uid in request.resource.data.participantIds;
 *   }
 */

export type FriendshipStatus = "pending" | "accepted";

/**
 * From the perspective of one specific user, the relationship to
 * another user can be in one of:
 *   - "self":             you can't friend yourself
 *   - "none":             no record exists
 *   - "pending_outgoing": you sent a request, waiting on them
 *   - "pending_incoming": they sent you a request, waiting on you
 *   - "friends":          accepted both ways
 */
export type RelationshipStatus =
  | "self"
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "friends";

export interface Friendship {
  id: string;
  participantIds: string[];
  requesterId: string;
  recipientId: string;
  status: FriendshipStatus;
  createdAt: string; // ISO
  acceptedAt?: string;
}

interface FirestoreFriendshipDoc {
  participantIds: string[];
  requesterId: string;
  recipientId: string;
  status: FriendshipStatus;
  createdAt?: Timestamp;
  acceptedAt?: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function tsToIso(t: Timestamp | undefined | null): string {
  if (!t) return new Date().toISOString();
  try {
    return t.toDate().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/** Deterministic friendship id - identical regardless of who initiates. */
export function friendshipId(uidA: string, uidB: string): string {
  const [low, high] = [uidA, uidB].sort();
  return `friend_${low}_${high}`;
}

function docToFriendship(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): Friendship {
  const data = d.data() as FirestoreFriendshipDoc;
  return {
    id: d.id,
    participantIds: data.participantIds ?? [],
    requesterId: data.requesterId,
    recipientId: data.recipientId,
    status: data.status,
    createdAt: tsToIso(data.createdAt),
    acceptedAt: data.acceptedAt ? tsToIso(data.acceptedAt) : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Subscription                                                        */
/* ------------------------------------------------------------------ */

export interface UseFriendshipsResult {
  friendships: Friendship[];
  /** Accepted friendships only. */
  friends: Friendship[];
  /** Requests waiting on me to accept/decline. */
  incomingRequests: Friendship[];
  /** Requests I sent that are still pending. */
  outgoingRequests: Friendship[];
  loading: boolean;
  error: string | null;
  isFirebase: boolean;
}

/**
 * Realtime list of every friendship doc the current user is part of.
 * Buckets it into friends / incoming / outgoing in one place so each
 * consumer doesn't redo the filter.
 */
export function useFriendships(): UseFriendshipsResult {
  const userId = useAuth((s) => s.user?.id);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState<boolean>(
    Boolean(userId) && isFirebaseConfigured,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !isFirebaseConfigured) {
      setFriendships([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) return;
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, "friendships"),
      where("participantIds", "array-contains", userId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setFriendships(snap.docs.map(docToFriendship));
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error("[friendships]", err);
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [userId]);

  const buckets = useMemo(() => {
    const friends: Friendship[] = [];
    const incomingRequests: Friendship[] = [];
    const outgoingRequests: Friendship[] = [];
    for (const f of friendships) {
      if (f.status === "accepted") {
        friends.push(f);
      } else if (f.status === "pending") {
        if (f.recipientId === userId) incomingRequests.push(f);
        else outgoingRequests.push(f);
      }
    }
    // Newest first - more useful in the UI.
    incomingRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    outgoingRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    friends.sort((a, b) =>
      (b.acceptedAt ?? b.createdAt).localeCompare(a.acceptedAt ?? a.createdAt),
    );
    return { friends, incomingRequests, outgoingRequests };
  }, [friendships, userId]);

  return {
    friendships,
    friends: buckets.friends,
    incomingRequests: buckets.incomingRequests,
    outgoingRequests: buckets.outgoingRequests,
    loading,
    error,
    isFirebase: isFirebaseConfigured,
  };
}

/**
 * Resolve the relationship between the current user and another user.
 * Cheap lookup over the in-memory friendships subscription.
 */
export function useRelationship(otherUserId: string | null | undefined): {
  status: RelationshipStatus;
  friendship: Friendship | null;
} {
  const currentUserId = useAuth((s) => s.user?.id);
  const { friendships } = useFriendships();
  return useMemo(() => {
    if (!currentUserId || !otherUserId) {
      return { status: "none" as RelationshipStatus, friendship: null };
    }
    if (currentUserId === otherUserId) {
      return { status: "self" as RelationshipStatus, friendship: null };
    }
    const f = friendships.find(
      (x) =>
        x.participantIds.includes(currentUserId) &&
        x.participantIds.includes(otherUserId),
    );
    if (!f) return { status: "none" as RelationshipStatus, friendship: null };
    if (f.status === "accepted") {
      return { status: "friends" as RelationshipStatus, friendship: f };
    }
    return {
      status:
        f.requesterId === currentUserId
          ? ("pending_outgoing" as RelationshipStatus)
          : ("pending_incoming" as RelationshipStatus),
      friendship: f,
    };
  }, [friendships, currentUserId, otherUserId]);
}

/** Just the count - used for the UI badge on the Friends tab. */
export function useIncomingFriendRequestCount(): number {
  const { incomingRequests } = useFriendships();
  return incomingRequests.length;
}

/**
 * Set of accepted-friend uids for the current user.
 *
 * Used by DM gating: when a recipient has dmPrivacy = "friends", we
 * need to check membership synchronously at send time. Memoised on
 * the friendships array so the set is stable across renders.
 */
export function useFriendIdSet(): Set<string> {
  const userId = useAuth((s) => s.user?.id);
  const { friends } = useFriendships();
  return useMemo(() => {
    const s = new Set<string>();
    if (!userId) return s;
    for (const f of friends) {
      for (const id of f.participantIds) {
        if (id !== userId) s.add(id);
      }
    }
    return s;
  }, [friends, userId]);
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

/**
 * Send a friend request. Idempotent:
 *   - if a request from the other side is already pending, it's
 *     accepted instead (mutual follow == friendship)
 *   - if you've already sent a request, it's a no-op
 *   - if you're already friends, no-op
 */
export async function sendFriendRequest(
  currentUserId: string,
  otherUserId: string,
): Promise<{ ok: boolean; status?: FriendshipStatus; error?: string }> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: "Friends need Firebase to be configured." };
  }
  if (currentUserId === otherUserId) {
    return { ok: false, error: "You can't friend yourself." };
  }
  const db = getDb();
  if (!db) return { ok: false, error: "Firestore unavailable." };

  const fid = friendshipId(currentUserId, otherUserId);
  const ref = doc(db, "friendships", fid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as FirestoreFriendshipDoc;
      if (data.status === "accepted") {
        return { ok: true, status: "accepted" };
      }
      // Pending: if they were the requester, this counts as accept.
      if (data.requesterId === otherUserId) {
        await updateDoc(ref, {
          status: "accepted",
          acceptedAt: serverTimestamp(),
        });
        return { ok: true, status: "accepted" };
      }
      // We already sent it - leave it alone.
      return { ok: true, status: "pending" };
    }
    const participantIds = [currentUserId, otherUserId].sort();
    await setDoc(ref, {
      participantIds,
      requesterId: currentUserId,
      recipientId: otherUserId,
      status: "pending" as FriendshipStatus,
      createdAt: serverTimestamp(),
    });
    return { ok: true, status: "pending" };
  } catch (err) {
    console.error("[sendFriendRequest]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to send request.",
    };
  }
}

/** Accept a pending incoming friend request. */
export async function acceptFriendRequest(
  friendshipDocId: string,
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  const db = getDb();
  if (!db) return false;
  try {
    await updateDoc(doc(db, "friendships", friendshipDocId), {
      status: "accepted",
      acceptedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("[acceptFriendRequest]", err);
    return false;
  }
}

/**
 * Used for: declining an incoming request, cancelling an outgoing
 * request, or removing an existing friend. All three are the same
 * operation - delete the friendship doc.
 */
export async function removeFriendship(
  friendshipDocId: string,
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  const db = getDb();
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "friendships", friendshipDocId));
    return true;
  } catch (err) {
    console.error("[removeFriendship]", err);
    return false;
  }
}
