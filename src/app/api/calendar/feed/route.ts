import { NextResponse } from "next/server";
import { COMMUNITY_EVENTS, type CalendarEvent } from "@/lib/events-data";
import { buildIcsFeed } from "@/lib/calendar-export";
import { useSupabaseBackend } from "@/lib/supabase";
import { getAnonServerClient } from "@/lib/supabase-server";

/**
 * GET /api/calendar/feed
 *
 * Public iCalendar feed of all AYMS community events. Under the
 * Supabase backend it reads the `events` table with the anon key
 * (public-select RLS — it's a public feed); otherwise it reads
 * Firestore via the REST API (not the client SDK, which can't
 * establish a WebSocket from a serverless function). Falls back to
 * the static COMMUNITY_EVENTS seed when the backend is unreachable.
 */
export const runtime = "nodejs";
export const revalidate = 3600;

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
}

async function loadEventsFromSupabase(): Promise<CalendarEvent[] | null> {
  const sb = getAnonServerClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("events")
      .select(
        "id, title, description, date, end_date, start_time, end_time, type, location",
      )
      .limit(500);
    if (error || !data || data.length === 0) return null;
    return (data as EventFeedRow[])
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
    console.warn("[calendar-feed] Supabase load failed", err);
    return null;
  }
}

async function loadEventsFromFirestore(): Promise<CalendarEvent[] | null> {
  if (!PROJECT_ID) return null;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/events?pageSize=500`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const docs = (data.documents ?? []) as Array<{
      name: string;
      fields: Record<
        string,
        { stringValue?: string; nullValue?: string }
      >;
    }>;
    if (docs.length === 0) return null;
    return docs
      .map((d) => {
        const f = d.fields;
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
        };
      })
      .filter((e) => e.date);
  } catch (err) {
    console.warn("[calendar-feed] Firestore REST load failed", err);
    return null;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request: Request) {
  const events = useSupabaseBackend
    ? ((await loadEventsFromSupabase()) ?? COMMUNITY_EVENTS)
    : ((await loadEventsFromFirestore()) ?? COMMUNITY_EVENTS);
  const ics = buildIcsFeed(events, {
    name: "AYMS Community Events",
    description:
      "Live, read-only feed of upcoming AYMS trips, meetups, camp dates, and social events.",
  });

  const filename = "ayms-community.ics";
  const url = new URL(request.url);
  const inline = url.searchParams.get("download") !== "1";

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8; method=PUBLISH",
      "Content-Disposition": inline
        ? `inline; filename="${filename}"`
        : `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Published-TTL": "PT1H",
      // Google Calendar, Apple, and Outlook fetch this URL from their
      // own servers. Without CORS they may reject the response.
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    },
  });
}
