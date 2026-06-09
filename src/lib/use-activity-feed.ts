"use client";

/**
 * Read-only community activity feed for the community home page.
 *
 * Subscribes to the top-level `messages` collection (the same channel
 * messages `use-firebase-chat.ts` writes) WITHOUT mutating anything,
 * and surfaces the most recent posts as a "what's happening" stream.
 *
 * IMPORTANT: this hook deliberately does NOT import or touch
 * use-firebase-chat.ts. It owns its own lightweight onSnapshot so the
 * home feed stays decoupled from the full chat surface (no sending,
 * editing, reactions, threads — just a read).
 *
 * House patterns followed (see use-events.ts / use-notifications.ts):
 *   - getDb() is always guarded; unconfigured Firebase => empty feed.
 *   - onSnapshot WITHOUT orderBy (sorted client-side) + limit(), so no
 *     composite index is required.
 *   - Timestamps converted to ISO strings; missing values handled.
 */

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ActivityItem {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  /** ISO timestamp; drives sort + relative-time display. */
  createdAt: string;
  /** True when this message is a reply inside a thread (we hide those
   *  from the headline feed to avoid out-of-context snippets). */
  isThreadReply: boolean;
}

interface FirestoreMessageDoc {
  channelId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  content?: string;
  threadParentId?: string | null;
  createdAt?: Timestamp;
}

function docToActivity(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): ActivityItem | null {
  const data = d.data() as FirestoreMessageDoc;
  // Skip writes whose serverTimestamp hasn't resolved yet — we can't
  // place them on the timeline meaningfully until the server confirms.
  if (!data.createdAt) return null;
  return {
    id: d.id,
    channelId: data.channelId ?? "general",
    userId: data.userId ?? "",
    userName: data.userName ?? "Someone",
    userAvatar: data.userAvatar ?? "",
    content: data.content ?? "",
    createdAt: data.createdAt.toDate().toISOString(),
    isThreadReply: Boolean(data.threadParentId),
  };
}

/* ------------------------------------------------------------------ */
/* Public hook                                                         */
/* ------------------------------------------------------------------ */

const FEED_LIMIT = 60;

export interface UseActivityFeedResult {
  /** Recent top-level community posts, newest first. */
  items: ActivityItem[];
  loading: boolean;
  isFirebase: boolean;
}

/**
 * Live, read-only feed of recent community channel posts.
 *
 * @param max  How many headline items to return after filtering out
 *             thread replies and empty messages. Defaults to 12.
 */
export function useActivityFeed(max = 12): UseActivityFeedResult {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);

  useEffect(() => {
    // Unconfigured Firebase: initial state already reflects the empty,
    // not-loading case (items=[], loading=isFirebaseConfigured=false),
    // so there's nothing to synchronise here — bail before subscribing.
    if (!isFirebaseConfigured) return;
    const db = getDb();
    // getDb() only returns null when Firebase isn't configured, which the
    // guard above already handled — so this is effectively unreachable
    // when configured. Bail without a synchronous setState (the snapshot
    // callbacks below own every loading transition).
    if (!db) return;
    // orderBy("createdAt","desc") fetches the NEWEST FEED_LIMIT docs.
    // A single-collection query with no where clause needs only the
    // auto-created single-field index (no composite). We still sort
    // newest-first client-side as a defensive normalization.
    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "desc"),
      limit(FEED_LIMIT),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: ActivityItem[] = [];
        for (const d of snap.docs) {
          const item = docToActivity(d);
          if (item) next.push(item);
        }
        next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setItems(next);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[activity-feed] snapshot failed", err);
        setItems([]);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const headline = useMemo(() => {
    return items
      .filter((i) => !i.isThreadReply && i.content.trim().length > 0)
      .slice(0, Math.max(0, max));
  }, [items, max]);

  return {
    items: headline,
    loading,
    isFirebase: isFirebaseConfigured,
  };
}
