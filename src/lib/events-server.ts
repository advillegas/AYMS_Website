/**
 * Server-side loader for the LIVE public events list.
 *
 * Used by Server Components / route handlers that previously rendered the
 * static COMMUNITY_EVENTS seed array (the /api/calendar/feed iCal feed and
 * the /events + /featured JSON-LD layouts). The database is the only
 * source of events — if it can't be reached this returns [] so deleted
 * events never reappear anywhere, not even in metadata.
 *
 * Reads the backend selected by NEXT_PUBLIC_USE_SUPABASE (same switch as
 * the client hooks). Never import this from a "use client" file.
 */

import type { CalendarEvent } from "./events-data";
import { useSupabaseBackend } from "./supabase";
import { getAnonServerClient } from "./supabase-server";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

interface EventFeedRow {
  id: string;
  title: string | null;
  description: string | null;
  date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  type: string | null;
  location: string | null;
  published: boolean | null;
}

async function loadFromSupabase(): Promise<CalendarEvent[]> {
  const sb = getAnonServerClient();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("events")
      .select(
        "id, title, description, date, end_date, start_time, end_time, type, location, published",
      )
      .limit(500);
    if (error || !data) return [];
    return (data as EventFeedRow[])
      .filter((r) => r.published !== false)
      .map((r) => ({
        id: r.id,
        title: r.title ?? "",
        description: r.description ?? "",
        date: r.date ?? "",
        endDate: r.end_date || undefined,
        startTime: r.start_time || undefined,
        endTime: r.end_time || undefined,
        type: (r.type ?? "social") as CalendarEvent["type"],
        location: r.location ?? "",
      }))
      .filter((e) => e.date);
  } catch (err) {
    console.warn("[events-server] Supabase load failed", err);
    return [];
  }
}

async function loadFromFirestore(): Promise<CalendarEvent[]> {
  if (!PROJECT_ID) return [];
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/events?pageSize=500`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const docs = (data.documents ?? []) as Array<{
      name: string;
      fields: Record<
        string,
        { stringValue?: string; booleanValue?: boolean; nullValue?: string }
      >;
    }>;
    return docs
      .map((d) => {
        const f = d.fields ?? {};
        const id = d.name.split("/").pop() ?? "";
        return {
          id,
          title: f.title?.stringValue ?? "",
          description: f.description?.stringValue ?? "",
          date: f.date?.stringValue ?? "",
          endDate: f.endDate?.stringValue || undefined,
          startTime: f.startTime?.stringValue || undefined,
          endTime: f.endTime?.stringValue || undefined,
          type: (f.type?.stringValue ?? "social") as CalendarEvent["type"],
          location: f.location?.stringValue ?? "",
          // Missing field counts as published (legacy events).
          published: f.published?.booleanValue,
        };
      })
      .filter((e) => e.published !== false)
      .filter((e) => e.date)
      .map((e) => {
        const { published: _pub, ...rest } = e;
        void _pub;
        return rest;
      });
  } catch (err) {
    console.warn("[events-server] Firestore REST load failed", err);
    return [];
  }
}

/** All published events from the active backend, [] when unreachable. */
export function loadPublicEvents(): Promise<CalendarEvent[]> {
  return useSupabaseBackend ? loadFromSupabase() : loadFromFirestore();
}

/** Upcoming published events, soonest first (for JSON-LD / previews). */
export async function loadUpcomingPublicEvents(
  max = 10,
): Promise<CalendarEvent[]> {
  const events = await loadPublicEvents();
  const today = new Date().toISOString().slice(0, 10);
  return events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, max);
}
