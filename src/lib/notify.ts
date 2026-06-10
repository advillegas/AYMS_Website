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
 *
 * When `useSupabaseBackend` is on, the same API persists to the
 * `notifications` table instead (one row per item, recipient_id =
 * canonical users.id — never the Supabase auth uid).
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
import { getSupabase, useSupabaseBackend } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";
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
  if (!toUserId) return null;
  if (useSupabaseBackend) return pushNotificationSupabase(toUserId, input);
  if (!isFirebaseConfigured) return null;
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

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function pushNotificationSupabase(
  toUserId: string,
  input: PushNotificationInput,
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  // Client-generated id so the insert needs no SELECT-back (RLS only
  // lets the recipient read their own rows).
  const id = generateId();
  const { error } = await sb.from("notifications").insert({
    id,
    recipient_id: toUserId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? "",
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    actor_avatar: input.actorAvatar ?? null,
    href: input.href ?? "",
    read: false,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.warn("[notify:sb] push failed", error.message);
    return null;
  }
  return id;
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
  return useSupabaseBackend
    ? usePushedNotificationsSupabase()
    : usePushedNotificationsFirebase();
}

function usePushedNotificationsFirebase(): UsePushedNotificationsResult {
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

/* ------------------------------------------------------------------ */
/* Supabase consumer                                                   */
/* ------------------------------------------------------------------ */

interface NotificationRow {
  id: string;
  recipient_id: string;
  kind: string;
  title: string;
  body: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  href: string | null;
  read: boolean | null;
  created_at: string | null;
}

function rowToNotification(r: NotificationRow): PushedNotification {
  return {
    id: r.id,
    kind: (r.kind as NotifyKind) ?? "system",
    title: r.title ?? "",
    body: r.body ?? "",
    actorId: r.actor_id ?? undefined,
    actorName: r.actor_name ?? undefined,
    actorAvatar: r.actor_avatar ?? undefined,
    href: r.href ?? "",
    createdAt: r.created_at
      ? new Date(r.created_at).toISOString()
      : new Date(0).toISOString(),
    read: Boolean(r.read),
  };
}

function usePushedNotificationsSupabase(): UsePushedNotificationsResult {
  const uid = useAuth((s) => s.user?.id);
  const [items, setItems] = useState<PushedNotification[]>([]);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }
    const unsub = subscribeQuery<NotificationRow>(
      "notifications",
      (sb) =>
        sb
          .from("notifications")
          .select("*")
          .eq("recipient_id", uid)
          .order("created_at", { ascending: false })
          .limit(100),
      (rows) => setItems(rows.map(rowToNotification)),
      (msg) => console.warn("[notify:sb] query failed", msg),
      { column: "recipient_id", value: uid },
    );
    return unsub;
  }, [uid]);

  const unreadCount = useMemo(
    () => items.reduce((n, it) => n + (it.read ? 0 : 1), 0),
    [items],
  );

  const markRead = useCallback(
    (id: string) => {
      if (!uid) return;
      const sb = getSupabase();
      if (!sb) return;
      void sb
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.warn("[notify:sb] markRead failed", error.message);
        });
    },
    [uid],
  );

  const markAllRead = useCallback(() => {
    if (!uid) return;
    const sb = getSupabase();
    if (!sb) return;
    void sb
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", uid)
      .eq("read", false)
      .then(({ error }) => {
        if (error) console.warn("[notify:sb] markAllRead failed", error.message);
      });
  }, [uid]);

  return { items, unreadCount, markRead, markAllRead };
}
