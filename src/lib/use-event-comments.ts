"use client";

/**
 * Realtime event comments backed by a Firestore subcollection at
 * `events/{eventId}/comments/{commentId}`. Each calendar event gets
 * its own thread so members can RSVP, ask questions, or trade
 * planning notes without polluting the channel chat.
 */

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useAuth } from "./store";

export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  /** ISO timestamp; "" if the serverTimestamp hasn't resolved yet. */
  createdAt: string;
}

interface FirestoreEventCommentDoc {
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt?: Timestamp;
}

function tsToIso(ts: Timestamp | undefined): string {
  if (!ts) return "";
  try {
    return ts.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToComment(
  eventId: string,
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): EventComment {
  const data = d.data() as FirestoreEventCommentDoc;
  return {
    id: d.id,
    eventId,
    userId: data.userId,
    userName: data.userName,
    userAvatar: data.userAvatar,
    content: data.content ?? "",
    createdAt: tsToIso(data.createdAt),
  };
}

interface UseEventCommentsResult {
  comments: EventComment[];
  loading: boolean;
  error: string | null;
  addComment: (content: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  isFirebase: boolean;
}

/**
 * Subscribes to all comments on a single event in realtime. Returns
 * an empty list when Firestore isn't configured (graceful fallback
 * for the marketing site / local dev without Firebase).
 */
export function useEventComments(
  eventId: string | null,
): UseEventCommentsResult {
  const user = useAuth((s) => s.user);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !isFirebaseConfigured) {
      setComments([]);
      return;
    }
    const db = getDb();
    if (!db) return;

    setLoading(true);
    setError(null);

    // Sort client-side to avoid forcing an index on (eventId, createdAt)
    // — the subcollection is keyed by eventId already, so the read is
    // bounded and the post-fetch sort is cheap.
    const q = query(collection(db, "events", eventId, "comments"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => docToComment(eventId, d))
          .sort((a, b) => {
            // Newest pending writes (no resolved timestamp yet) sort
            // last so users see them appended to the bottom rather
            // than jumping to the top.
            const ta = a.createdAt || "\uffff";
            const tb = b.createdAt || "\uffff";
            return ta.localeCompare(tb);
          });
        setComments(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error("[event-comments]", err);
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [eventId]);

  const addComment = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed || !eventId || !user) return false;
      if (!isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        await addDoc(collection(db, "events", eventId, "comments"), {
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar ?? "",
          content: trimmed,
          createdAt: serverTimestamp(),
        });
        return true;
      } catch (err) {
        console.error("[event-comments] add failed", err);
        const m = err instanceof Error ? err.message : "Couldn't post comment";
        setError(m);
        return false;
      }
    },
    [eventId, user],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!eventId || !user) return false;
      if (!isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        await deleteDoc(doc(db, "events", eventId, "comments", commentId));
        return true;
      } catch (err) {
        console.error("[event-comments] delete failed", err);
        return false;
      }
    },
    [eventId, user],
  );

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    isFirebase: isFirebaseConfigured,
  };
}
