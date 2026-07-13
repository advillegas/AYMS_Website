"use client";

/**
 * Lightweight, zero-dependency activity tracking pipeline.
 *
 * Records page views (route + referrer on every client-side route
 * change, via <ActivityTracker /> in the root layout) and key product
 * actions (sign-in, sign-up, trip reservations, waitlist joins,
 * newsletter signups, concierge inquiries, channel messages, RSVPs,
 * agreement signatures). Powers /community/admin/analytics.
 *
 * Storage follows the house dual-backend pattern (`useSupabaseBackend`
 * from ./supabase):
 *   • Supabase (PRIMARY, live in production): `activity_events` table —
 *     schema + RLS in supabase/activity-events.sql (public insert,
 *     admin-only read).
 *   • Firestore (legacy/secondary): `activityEvents` collection —
 *     rules in firestore.rules (world create w/ field validation,
 *     admin-only read).
 *
 * Every write is fire-and-forget: failures are swallowed with a
 * console.warn and can NEVER block or error the visitor's UI (e.g.
 * when backend policies haven't been deployed yet).
 *
 * Privacy:
 *   • Message CONTENTS are never recorded — counts + channel ids only.
 *   • DM conversations are not tracked at all.
 *   • Anonymous visitors are keyed by a random localStorage session id.
 *   • Nothing is tracked while the admin site editor (edit mode) is on,
 *     and admin surfaces (/admin, /community/admin) don't log views.
 *
 * Retention: events are append-only. Prune periodically from the
 * Supabase SQL editor (see supabase/activity-events.sql header) — e.g.
 * `delete from activity_events where created_at < now() - interval
 * '180 days'`. No cron is wired up yet; if volume grows, hang a
 * scheduled Edge Function off that same statement.
 */

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getCountFromServer,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { getSupabase, useSupabaseBackend } from "./supabase";
import { subscribeQuery, tsToIso } from "./supabase-helpers";
import { useAuth } from "./store";
import { useEditMode } from "./edit-mode";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ActivityType =
  | "page_view"
  | "sign_in"
  | "sign_up"
  | "trip_reservation"
  | "waitlist_join"
  | "newsletter_signup"
  | "concierge_inquiry"
  | "message_sent"
  | "event_rsvp"
  | "agreement_signed";

export interface ActivityEvent {
  id: string;
  type: ActivityType | string;
  path: string;
  userId: string | null;
  sessionId: string;
  /** ISO timestamp of the event. */
  tsISO: string;
  meta: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Session + guards                                                    */
/* ------------------------------------------------------------------ */

const SESSION_KEY = "ayms.activity.sid";

/** Stable anonymous visitor id (random, no PII), persisted per browser. */
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = window.localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "";
  }
}

/** Admin surfaces never count as visitor traffic. */
function isAdminPath(path: string): boolean {
  return path.startsWith("/admin") || path.startsWith("/community/admin");
}

/** Drop everything while the site editor is active (admin previewing). */
function inEditMode(): boolean {
  try {
    return useEditMode.getState().isEditMode;
  } catch {
    return false;
  }
}

/** Meta must be a plain JSON object (drops undefined; Firestore rejects it). */
function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  try {
    return JSON.parse(JSON.stringify(meta)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Write path (fire-and-forget, silent-fail)                           */
/* ------------------------------------------------------------------ */

function persist(evt: {
  type: string;
  path: string;
  userId: string | null;
  sessionId: string;
  tsISO: string;
  meta: Record<string, unknown>;
}): void {
  // Supabase — the live production backend.
  if (useSupabaseBackend) {
    const sb = getSupabase();
    if (!sb) return;
    void sb
      .from("activity_events")
      .insert({
        type: evt.type,
        path: evt.path,
        user_id: evt.userId,
        session_id: evt.sessionId,
        meta: evt.meta,
        created_at: evt.tsISO,
      })
      .then(({ error }) => {
        if (error) console.warn("[activity] insert failed", error.message);
      });
    return;
  }

  // Firestore — legacy/secondary path behind the flag.
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  void addDoc(collection(db, "activityEvents"), {
    type: evt.type,
    path: evt.path,
    userId: evt.userId,
    sessionId: evt.sessionId,
    tsISO: evt.tsISO,
    meta: evt.meta,
    createdAt: serverTimestamp(),
  }).catch((err) => console.warn("[activity] write failed", err));
}

/**
 * Record a product action. Never throws, never blocks — safe to call
 * from any submit handler without awaiting.
 */
export function trackEvent(
  type: ActivityType,
  meta?: Record<string, unknown>,
): void {
  try {
    if (typeof window === "undefined" || inEditMode()) return;
    persist({
      type,
      path: window.location.pathname,
      userId: useAuth.getState().user?.id ?? null,
      sessionId: getSessionId(),
      tsISO: new Date().toISOString(),
      meta: sanitizeMeta(meta),
    });
  } catch (err) {
    console.warn("[activity] trackEvent failed", err);
  }
}

// Dedupe guard: Strict Mode double-mounts (dev) and rapid re-renders
// would otherwise double-log the same route.
let lastViewPath: string | null = null;
let lastViewAt = 0;

/** Record a page view. Called by <ActivityTracker /> on route change. */
export function trackPageView(path: string, referrer: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (!path || isAdminPath(path) || inEditMode()) return;
    const now = Date.now();
    if (path === lastViewPath && now - lastViewAt < 4000) return;
    lastViewPath = path;
    lastViewAt = now;
    persist({
      type: "page_view",
      path,
      userId: useAuth.getState().user?.id ?? null,
      sessionId: getSessionId(),
      tsISO: new Date().toISOString(),
      meta: referrer ? { referrer } : {},
    });
  } catch (err) {
    console.warn("[activity] trackPageView failed", err);
  }
}

/* ------------------------------------------------------------------ */
/* Read path (admin analytics + member CRM)                            */
/* ------------------------------------------------------------------ */

interface ActivityRow {
  id: string;
  type: string | null;
  path: string | null;
  user_id: string | null;
  session_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string | null;
}

function rowToEvent(r: ActivityRow): ActivityEvent {
  return {
    id: r.id,
    type: r.type ?? "unknown",
    path: r.path ?? "",
    userId: r.user_id,
    sessionId: r.session_id ?? "",
    tsISO: tsToIso(r.created_at),
    meta: r.meta ?? {},
  };
}

interface ActivityDoc {
  type?: string;
  path?: string;
  userId?: string | null;
  sessionId?: string;
  tsISO?: string;
  meta?: Record<string, unknown>;
}

function docToEvent(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): ActivityEvent {
  const data = d.data() as ActivityDoc;
  return {
    id: d.id,
    type: data.type ?? "unknown",
    path: data.path ?? "",
    userId: data.userId ?? null,
    sessionId: data.sessionId ?? "",
    tsISO: data.tsISO ?? "",
    meta: data.meta ?? {},
  };
}

export interface UseActivityEventsResult {
  events: ActivityEvent[];
  loading: boolean;
  /** True when a live backend is wired (used for empty-state copy). */
  isLive: boolean;
}

/**
 * Live stream of the newest tracked events (admin-only read; non-admins
 * get an empty list from RLS / rules, surfaced as the dashboard's
 * "tracking starts collecting from first deploy" empty state).
 *
 * Optional `userId` narrows to one member (the members-admin CRM pane).
 */
export function useActivityEvents(
  cap: number,
  userId?: string,
): UseActivityEventsResult {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(
    useSupabaseBackend || isFirebaseConfigured,
  );

  useEffect(() => {
    if (useSupabaseBackend) {
      return subscribeQuery<ActivityRow>(
        "activity_events",
        (sb) => {
          let q = sb.from("activity_events").select("*");
          if (userId) q = q.eq("user_id", userId);
          return q
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(cap);
        },
        (rows) => {
          // Realtime deltas append; keep newest-first + capped locally.
          setEvents(
            rows
              .map(rowToEvent)
              .sort((a, b) => b.tsISO.localeCompare(a.tsISO))
              .slice(0, cap),
          );
          setLoading(false);
        },
        (msg) => {
          console.warn("[activity:sb] query failed", msg);
          setLoading(false);
        },
        userId ? { column: "user_id", value: userId } : undefined,
      );
    }
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    // Single-field orderBy — auto-indexed. The per-member variant swaps
    // orderBy for a where (mixing both would need a composite index)
    // and sorts client-side, matching the house pattern.
    const q = userId
      ? query(
          collection(db, "activityEvents"),
          where("userId", "==", userId),
          fsLimit(cap),
        )
      : query(
          collection(db, "activityEvents"),
          orderBy("tsISO", "desc"),
          fsLimit(cap),
        );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(
          snap.docs
            .map(docToEvent)
            .sort((a, b) => b.tsISO.localeCompare(a.tsISO)),
        );
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[activity] snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [cap, userId]);

  return {
    events,
    loading,
    isLive: useSupabaseBackend || isFirebaseConfigured,
  };
}

/**
 * One-shot count of channel messages authored by a member (the CRM
 * pane's "messages sent" stat). Count-only queries — no contents leave
 * the backend. Resolves null when the backend denies or isn't wired.
 */
export function useMemberMessageCount(userId: string | null): number | null {
  // Keyed by uid so switching members shows null (loading) until this
  // member's count lands — no synchronous reset needed in the effect.
  const [state, setState] = useState<{ uid: string; value: number } | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    if (useSupabaseBackend) {
      const sb = getSupabase();
      if (!sb) return;
      void sb
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .then(({ count: c, error }) => {
          if (cancelled) return;
          if (error) {
            console.warn("[activity:sb] message count failed", error.message);
            return;
          }
          setState({ uid: userId, value: c ?? 0 });
        });
      return () => {
        cancelled = true;
      };
    }

    if (!isFirebaseConfigured) return;
    const db = getDb();
    if (!db) return;
    void getCountFromServer(
      query(collection(db, "messages"), where("userId", "==", userId)),
    )
      .then((snap) => {
        if (!cancelled) setState({ uid: userId, value: snap.data().count });
      })
      .catch((err) => console.warn("[activity] message count failed", err));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state && state.uid === userId ? state.value : null;
}
