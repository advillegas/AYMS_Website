"use client";

/**
 * Admin analytics aggregation — purely client-side, no new deps.
 *
 * Subscribes to the same three Firestore collections the rest of the
 * app already reads (`users`, `messages`, `events`) and folds them
 * into a handful of small, chart-ready series:
 *
 *   - member growth       (cumulative joins per month, from users.joinedDate)
 *   - new signups         (joins per month — the non-cumulative view)
 *   - channel activity    (message count per channelId, last 30 days)
 *   - daily message volume(messages per day, last 14 days)
 *   - upcoming events      (count + the next few, from events.date)
 *
 * No `orderBy` on the Firestore queries (so no composite indexes) —
 * everything is sorted/aggregated in memory, matching the house pattern
 * in `use-events.ts` / `use-community-members.ts`. Each query is capped
 * with `limit()` so a large space can't blow up the tab; the caps are
 * generous enough for the dashboards we render. The Supabase mirror DOES
 * order server-side (newest first) so the cap keeps recent rows — see
 * `useCollection`.
 *
 * Falls back to empty series (loading=false) when Firebase isn't
 * configured so the analytics page still renders its empty states.
 */

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  query,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";
import { useChannels } from "./use-channels-store";

/* ------------------------------------------------------------------ */
/* Public series shapes                                                */
/* ------------------------------------------------------------------ */

export interface MonthPoint {
  /** "YYYY-MM" sort key. */
  key: string;
  /** Short human label, e.g. "Jan ’25". */
  label: string;
  /** New members that joined in this month. */
  joined: number;
  /** Cumulative members at the end of this month. */
  total: number;
}

export interface DayPoint {
  /** "YYYY-MM-DD" sort key. */
  key: string;
  /** Short label, e.g. "Jun 3". */
  label: string;
  count: number;
}

export interface ChannelActivity {
  channelId: string;
  name: string;
  count: number;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  location: string;
}

export interface AdminMetrics {
  loading: boolean;
  isLive: boolean;
  /** Headline counters. */
  totalMembers: number;
  newThisMonth: number;
  messages30d: number;
  upcomingCount: number;
  /** Series. */
  memberGrowth: MonthPoint[];
  channelActivity: ChannelActivity[];
  dailyMessages: DayPoint[];
  upcomingEvents: UpcomingEvent[];
}

/* ------------------------------------------------------------------ */
/* Date helpers (local-time, no deps)                                  */
/* ------------------------------------------------------------------ */

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const mi = Math.max(0, Math.min(11, Number(m) - 1));
  return `${MONTH_LABELS[mi]} ’${y.slice(2)}`;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function dayLabel(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

/** Parse a "YYYY-MM-DD" (or ISO) date string into a local Date, safely. */
function parseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  // Take just the date portion so "2024-09-01T..." and "2024-09-01"
  // both parse to local midnight (avoids TZ drift from `new Date(iso)`).
  const datePart = raw.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Accepts a Firestore Timestamp or a Postgres ISO string. */
function tsToDate(t: Timestamp | string | undefined | null): Date | null {
  if (!t) return null;
  if (typeof t === "string") {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof t.toDate !== "function") return null;
  try {
    return t.toDate();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Raw doc shapes (only the fields we aggregate)                       */
/* ------------------------------------------------------------------ */

interface UserRow {
  joinedDate?: string;
}

interface MessageRow {
  channelId?: string;
  createdAt?: Timestamp | string;
}

interface EventRow {
  title?: string;
  date?: string;
  type?: string;
  location?: string;
}

/* ------------------------------------------------------------------ */
/* Singleton-free, page-scoped subscriptions                           */
/* ------------------------------------------------------------------ */
/**
 * The analytics dashboard is the only mount point, so plain per-mount
 * listeners are fine here (unlike the chat-hot-path members store).
 */

function useCollection<T>(
  name: string,
  cap: number,
  map: (d: QueryDocumentSnapshot<DocumentData>) => T,
  /** Supabase row mapper (snake_case row → T) for the same table name. */
  mapRow: (r: Record<string, unknown>) => T,
  /**
   * Column to ORDER BY (descending, nulls last) in the Supabase branch
   * so the row cap keeps the NEWEST rows. Postgres `LIMIT` without
   * `ORDER BY` returns an arbitrary (in practice mostly oldest-first)
   * slice, which would starve the 30-day windows once a table outgrows
   * its cap. Firestore needs no equivalent: its random auto-IDs make
   * the capped read an approximately uniform time sample.
   */
  orderColumn: string,
): { rows: T[]; loading: boolean } {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(
    isFirebaseConfigured || useSupabaseBackend,
  );

  useEffect(() => {
    if (useSupabaseBackend) {
      return subscribeQuery<Record<string, unknown>>(
        name,
        (sb) =>
          sb
            .from(name)
            .select("*")
            .order(orderColumn, { ascending: false, nullsFirst: false })
            .limit(cap),
        (sbRows) => {
          setRows(sbRows.map(mapRow));
          setLoading(false);
        },
        (msg) => {
          console.warn(`[metrics:sb] ${name} query failed`, msg);
          setLoading(false);
        },
      );
    }
    if (!isFirebaseConfigured) {
      setRows([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, name), limit(cap));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map(map));
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn(`[metrics] ${name} snapshot failed`, err);
        setLoading(false);
      },
    );
    return () => unsub();
    // `map`/`mapRow` are recreated each render but identity doesn't
    // matter — we intentionally only (re)subscribe on collection/cap/
    // order change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, cap, orderColumn]);

  return { rows, loading };
}

/* ------------------------------------------------------------------ */
/* Public hook                                                         */
/* ------------------------------------------------------------------ */

export function useAdminMetrics(): AdminMetrics {
  const channels = useChannels((s) => s.channels);

  const { rows: users, loading: usersLoading } = useCollection<UserRow>(
    "users",
    5000,
    (d) => {
      const data = d.data() as UserRow;
      return { joinedDate: data.joinedDate };
    },
    (r) => ({ joinedDate: (r.joined_date as string | null) ?? undefined }),
    // joined_date, not created_at: migrated users all share a created_at
    // of the migration run, while joined_date is what growth aggregates.
    "joined_date",
  );

  const { rows: messages, loading: msgLoading } = useCollection<MessageRow>(
    "messages",
    5000,
    (d) => {
      const data = d.data() as MessageRow;
      return { channelId: data.channelId, createdAt: data.createdAt };
    },
    (r) => ({
      channelId: (r.channel_id as string | null) ?? undefined,
      createdAt: (r.created_at as string | null) ?? undefined,
    }),
    "created_at",
  );

  const { rows: events, loading: evLoading } = useCollection<EventRow & { id: string }>(
    "events",
    1000,
    (d) => {
      const data = d.data() as EventRow;
      return {
        id: d.id,
        title: data.title,
        date: data.date,
        type: data.type,
        location: data.location,
      };
    },
    (r) => ({
      id: String(r.id ?? ""),
      title: (r.title as string | null) ?? undefined,
      date: (r.date as string | null) ?? undefined,
      type: (r.type as string | null) ?? undefined,
      location: (r.location as string | null) ?? undefined,
    }),
    // Latest-dated first, so a capped read keeps every upcoming event.
    "date",
  );

  const channelNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of channels) m.set(c.id, c.name);
    return m;
  }, [channels]);

  return useMemo<AdminMetrics>(() => {
    const now = new Date();
    const loading = usersLoading || msgLoading || evLoading;

    /* ---- member growth (last 12 months, cumulative) -------------- */
    // Bucket joins by month, then walk forward filling the cumulative
    // total — including members who joined before the visible window so
    // the running total is correct from the first bar.
    const joinsByMonth = new Map<string, number>();
    let parsedJoins = 0;
    for (const u of users) {
      const dt = parseDate(u.joinedDate);
      if (!dt) continue;
      parsedJoins += 1;
      const k = monthKey(dt);
      joinsByMonth.set(k, (joinsByMonth.get(k) ?? 0) + 1);
    }

    // Build the trailing 12-month window of keys.
    const windowKeys: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      windowKeys.push(monthKey(d));
    }
    const firstWindowKey = windowKeys[0];

    // Cumulative total of everyone who joined strictly before the window.
    let runningTotal = 0;
    for (const [k, n] of joinsByMonth) {
      if (k < firstWindowKey) runningTotal += n;
    }

    const memberGrowth: MonthPoint[] = windowKeys.map((k) => {
      const joined = joinsByMonth.get(k) ?? 0;
      runningTotal += joined;
      return { key: k, label: monthLabel(k), joined, total: runningTotal };
    });

    const totalMembers =
      parsedJoins > 0 ? parsedJoins : users.length;
    const thisMonthKey = monthKey(now);
    const newThisMonth = joinsByMonth.get(thisMonthKey) ?? 0;

    /* ---- channel activity + daily volume (last 30 / 14 days) ----- */
    const cutoff30 = new Date(now);
    cutoff30.setDate(cutoff30.getDate() - 30);
    const cutoff14 = new Date(now);
    cutoff14.setDate(cutoff14.getDate() - 14);
    cutoff14.setHours(0, 0, 0, 0);

    const countByChannel = new Map<string, number>();
    const countByDay = new Map<string, number>();
    let messages30d = 0;

    for (const m of messages) {
      const dt = tsToDate(m.createdAt);
      if (!dt) continue;
      if (dt >= cutoff30) {
        messages30d += 1;
        if (m.channelId) {
          countByChannel.set(
            m.channelId,
            (countByChannel.get(m.channelId) ?? 0) + 1,
          );
        }
      }
      if (dt >= cutoff14) {
        const k = dayKey(dt);
        countByDay.set(k, (countByDay.get(k) ?? 0) + 1);
      }
    }

    const channelActivity: ChannelActivity[] = Array.from(
      countByChannel.entries(),
    )
      .map(([channelId, count]) => ({
        channelId,
        name: channelNameById.get(channelId) ?? channelId,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    // Fill the 14-day window so quiet days render as zero-height bars.
    const dailyMessages: DayPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const k = dayKey(d);
      dailyMessages.push({
        key: k,
        label: dayLabel(d),
        count: countByDay.get(k) ?? 0,
      });
    }

    /* ---- upcoming events ----------------------------------------- */
    const todayKey = dayKey(now);
    const upcoming = events
      .filter((e) => (e.date ?? "").slice(0, 10) >= todayKey)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const upcomingEvents: UpcomingEvent[] = upcoming.slice(0, 6).map((e) => ({
      id: e.id,
      title: e.title ?? "Untitled event",
      date: e.date ?? "",
      type: e.type ?? "social",
      location: e.location ?? "",
    }));

    return {
      loading,
      isLive: isFirebaseConfigured || useSupabaseBackend,
      totalMembers,
      newThisMonth,
      messages30d,
      upcomingCount: upcoming.length,
      memberGrowth,
      channelActivity,
      dailyMessages,
      upcomingEvents,
    };
  }, [
    users,
    messages,
    events,
    channelNameById,
    usersLoading,
    msgLoading,
    evLoading,
  ]);
}
