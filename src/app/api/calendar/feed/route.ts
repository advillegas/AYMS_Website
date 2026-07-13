import { NextResponse } from "next/server";
import { buildIcsFeed } from "@/lib/calendar-export";
import { loadPublicEvents } from "@/lib/events-server";

/**
 * GET /api/calendar/feed
 *
 * Public iCalendar feed of all AYMS community events. Reads the LIVE
 * published events from the active backend via lib/events-server (no
 * static fallback — an event the admin deleted must not linger in
 * subscribed calendars, so an unreachable backend yields an empty
 * feed rather than stale placeholder data).
 */
export const runtime = "nodejs";
export const revalidate = 3600;

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
  const events = await loadPublicEvents();
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
