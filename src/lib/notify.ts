"use client";

/**
 * Persistent, writable in-app notification stream.
 *
 * This is the shared seam every feature domain emits into. Unlike
 * `use-notifications.ts` (which *derives* a live feed from messages and
 * is lost when the tab closes), notifications written here persist in
 * Firestore at `notifications/{uid}/items/{autoId}` and survive reloads.
 *
 * Producers (events, identity/badges, admin/moderation, friends) call
 * `pushNotification(targetUid, { kind, title, ... })`.
 *
 * Consumers (the bell + the notification center page) call
 * `usePushedNotifications()` and merge the result with the derived feed.
 *
 * When Firebase isn't configured every call is a graceful no-op so the
 * site still works in local development, matching the rest of the data
 * layer (see `use-events.ts`).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useAuth } from "./store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Notification categories emitted across the app. Keep this union the
 * single source of truth so every producer stays consistent and the
 * center can group/filter by kind.
 */
export type NotifyKind =
  | "friend-request"
  | "friend-accept"
  | "welcome"
  | "badge"
  | "passport"
  | "reservation"
  | "rsvp"
  | "reminder"
  | "meetup"
  | "mod"
  | "report"
  | "system";

export interface PushNotificationInput {
  kind: NotifyKind;
  /** Headline shown in bold. */
  title: string;
  /** Optional one or two lines of context. */
  body?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  /** Relative href to navigate to when clicked. */
  href?: string;
}

export interface PushedNotification {
  id: string;
  kind: NotifyKind;
  title: string;
  body: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  href: string;
  /** ISO timestamp; drives sort + relative-time display. */
  createdAt: string;
  read: boolean;
}

interface NotifDoc {
  kind?: NotifyKind;
  title?: string;
  body?: string;
  actorId?: string | null;
  actorName?: string | null;
  actorAvatar?: string | null;
  href?: string;
  read?: boolean;
  createdAt?: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Producer                                                            */
/* ------------------------------------------------------------------ */

/**
 * Write a notification to a single recipient. Safe to call from any
 * client component; no-ops (returns null) when Firebase is unconfigured
 * or the recipient id is missing. Never throws — failures are logged.
 *
 * For fan-out (e.g. notify many members), call once per recipient.
 */
export async function pushNotification(
  toUserId: string,
  input: PushNotificationInput,
): Promise<string | null> {
  if (!isFirebaseConfigured || !toUserId) return null;
  const db = getDb();
  if (!db) return null;
  try {
    const ref = await addDoc(
      collection(db, "notifications", toUserId, "items"),
      {
        kind: input.kind,
        title: input.title,
        body: input.body ?? "",
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        actorAvatar: input.actorAvatar ?? null,
        href: input.href ?? "",
        read: false,
        createdAt: serverTimestamp(),
      },
    );
    return ref.id;
  } catch (err) {
    console.warn("[notify] push failed", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Consumer                                                            */
/* ------------------------------------------------------------------ */

function docToNotification(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): PushedNotification {
  const data = d.data() as NotifDoc;
  const ts = data.createdAt;
  return {
    id: d.id,
    kind: data.kind ?? "system",
    title: data.title ?? "",
    body: data.body ?? "",
    actorId: data.actorId ?? undefined,
    actorName: data.actorName ?? undefined,
    actorAvatar: data.actorAvatar ?? undefined,
    href: data.href ?? "",
    createdAt: ts ? ts.toDate().toISOString() : new Date(0).toISOString(),
    read: Boolean(data.read),
  };
}

export interface UsePushedNotificationsResult {
  items: PushedNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

/**
 * Live subscription to the current user's persistent notification
 * stream. Sorted newest-first client-side (no `orderBy`, so no
 * composite index is required — matches the house pattern).
 */
export function usePushedNotifications(): UsePushedNotificationsResult {
  const uid = useAuth((s) => s.user?.id);
  const [items, setItems] = useState<PushedNotification[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) {
      setItems([]);
      return;
    }
    const db = getDb();
    if (!db) return;
    const q = query(
      collection(db, "notifications", uid, "items"),
      limit(100),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToNotification)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setItems(list);
      },
      (err: FirestoreError) => {
        console.warn("[notify] snapshot failed", err);
      },
    );
    return () => unsub();
  }, [uid]);

  const unreadCount = useMemo(
    () => items.reduce((n, it) => n + (it.read ? 0 : 1), 0),
    [items],
  );

  const markRead = useCallback(
    (id: string) => {
      if (!isFirebaseConfigured || !uid) return;
      const db = getDb();
      if (!db) return;
      void updateDoc(
        doc(db, "notifications", uid, "items", id),
        { read: true },
      ).catch(() => {});
    },
    [uid],
  );

  const markAllRead = useCallback(() => {
    if (!isFirebaseConfigured || !uid) return;
    const db = getDb();
    if (!db) return;
    for (const it of items) {
      if (it.read) continue;
      void updateDoc(
        doc(db, "notifications", uid, "items", it.id),
        { read: true },
      ).catch(() => {});
    }
  }, [uid, items]);

  return { items, unreadCount, markRead, markAllRead };
}
