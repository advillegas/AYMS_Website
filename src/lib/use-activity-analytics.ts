"use client";

/**
 * Aggregates the tracked `activity_events` stream (see
 * src/lib/activity-tracker.ts) into chart-ready series for the admin
 * analytics dashboard: DAU/WAU, page views per day, top pages, action
 * breakdowns, tracked trip views (funnel top) and RSVPs per event.
 *
 * Reads via useActivityEvents, which follows the house dual-backend
 * pattern (Supabase `activity_events` primary; Firestore
 * `activityEvents` legacy). Everything here degrades to zeros/empty
 * series when the stream is empty (e.g. first deploy before the SQL
 * has been applied) — the dashboard shows "collecting…" empty states.
 */

import { useMemo } from "react";
import { useActivityEvents, type ActivityEvent } from "./activity-tracker";

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface ActivityDayPoint {
  /** "YYYY-MM-DD" sort key. */
  key: string;
  /** Short label, e.g. "Jun 3". */
  label: string;
  count: number;
}

export interface TopPage {
  path: string;
  count: number;
}

export interface ActionSlice {
  type: string;
  label: string;
  count: number;
}

export interface RsvpTally {
  targetType: string;
  targetId: string;
  count: number;
}

export interface ActivityAnalytics {
  loading: boolean;
  /** True when a live backend is configured at all. */
  isLive: boolean;
  /** True once at least one tracked event exists. */
  hasData: boolean;
  /** Newest-first raw events (for the live feed). */
  events: ActivityEvent[];
  /** Distinct signed-in/anonymous actors, last 24h / 7d. */
  dau: number;
  wau: number;
  pageViews7d: number;
  /** Page views per day, last 14 days (zero-filled). */
  pageViewsPerDay: ActivityDayPoint[];
  /** Most-viewed paths, last 7 days. */
  topPages: TopPage[];
  /** Non-page-view action counts, last 7 days (pie chart). */
  actionBreakdown7d: ActionSlice[];
  /** page_view events on /trips* in the last 30 days (funnel top). */
  tripViews30d: number;
  /** Tracked RSVP counts per event/meetup, most first. */
  rsvpsByTarget: RsvpTally[];
}

export const ACTION_LABEL: Record<string, string> = {
  page_view: "Page views",
  sign_in: "Sign-ins",
  sign_up: "Registrations",
  trip_reservation: "Trip reservations",
  waitlist_join: "Waitlist joins",
  newsletter_signup: "Newsletter signups",
  concierge_inquiry: "Concierge inquiries",
  message_sent: "Messages",
  event_rsvp: "Event RSVPs",
  agreement_signed: "Agreements signed",
};

/* ------------------------------------------------------------------ */
/* Date helpers (local-time, match use-admin-metrics)                  */
/* ------------------------------------------------------------------ */

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function dayLabel(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/** Cap generous enough for a small community's recent window. */
const EVENT_CAP = 2000;

export function useActivityAnalytics(): ActivityAnalytics {
  const { events, loading, isLive } = useActivityEvents(EVENT_CAP);

  return useMemo<ActivityAnalytics>(() => {
    const now = new Date();
    const cutoff = (hours: number) =>
      new Date(now.getTime() - hours * 3600_000).toISOString();
    const cut24h = cutoff(24);
    const cut7d = cutoff(24 * 7);
    const cut30d = cutoff(24 * 30);

    const actors24h = new Set<string>();
    const actors7d = new Set<string>();
    const viewsByDay = new Map<string, number>();
    const viewsByPath = new Map<string, number>();
    const actionCounts = new Map<string, number>();
    const rsvpCounts = new Map<string, RsvpTally>();
    let pageViews7d = 0;
    let tripViews30d = 0;

    const cut14dDate = new Date(now);
    cut14dDate.setDate(cut14dDate.getDate() - 13);
    cut14dDate.setHours(0, 0, 0, 0);
    const cut14d = cut14dDate.toISOString();

    for (const e of events) {
      const ts = e.tsISO;
      if (!ts) continue;
      const actor = e.userId ?? (e.sessionId ? `anon:${e.sessionId}` : null);

      if (ts >= cut24h && actor) actors24h.add(actor);
      if (ts >= cut7d && actor) actors7d.add(actor);

      if (e.type === "page_view") {
        if (ts >= cut7d) {
          pageViews7d += 1;
          viewsByPath.set(e.path, (viewsByPath.get(e.path) ?? 0) + 1);
        }
        if (ts >= cut14d) {
          const d = new Date(ts);
          if (!Number.isNaN(d.getTime())) {
            const k = dayKey(d);
            viewsByDay.set(k, (viewsByDay.get(k) ?? 0) + 1);
          }
        }
        if (ts >= cut30d && e.path.startsWith("/trips")) tripViews30d += 1;
        continue;
      }

      if (ts >= cut7d) {
        actionCounts.set(e.type, (actionCounts.get(e.type) ?? 0) + 1);
      }

      if (e.type === "event_rsvp") {
        const targetType = String(e.meta.targetType ?? "event");
        const targetId = String(e.meta.targetId ?? "");
        if (targetId) {
          const key = `${targetType}:${targetId}`;
          const cur = rsvpCounts.get(key);
          if (cur) cur.count += 1;
          else rsvpCounts.set(key, { targetType, targetId, count: 1 });
        }
      }
    }

    // Zero-filled 14-day window so quiet days still render.
    const pageViewsPerDay: ActivityDayPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const k = dayKey(d);
      pageViewsPerDay.push({
        key: k,
        label: dayLabel(d),
        count: viewsByDay.get(k) ?? 0,
      });
    }

    const topPages: TopPage[] = Array.from(viewsByPath.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const actionBreakdown7d: ActionSlice[] = Array.from(
      actionCounts.entries(),
    )
      .map(([type, count]) => ({
        type,
        label: ACTION_LABEL[type] ?? type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const rsvpsByTarget = Array.from(rsvpCounts.values()).sort(
      (a, b) => b.count - a.count,
    );

    return {
      loading,
      isLive,
      hasData: events.length > 0,
      events,
      dau: actors24h.size,
      wau: actors7d.size,
      pageViews7d,
      pageViewsPerDay,
      topPages,
      actionBreakdown7d,
      tripViews30d,
      rsvpsByTarget,
    };
  }, [events, loading, isLive]);
}
