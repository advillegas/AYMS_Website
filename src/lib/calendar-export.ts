import type { CalendarEvent } from "./events-data";

/**
 * Calendar export helpers.
 *
 * Three flavors of "get this on your calendar":
 *
 *  1. Per-event one-shot deeplinks (googleCalendarUrl, outlookCalendarUrl)
 *     - Open a pre-filled "create event" form in Google/Outlook. The
 *       user clicks save once and that single event is copied into
 *       their personal calendar.
 *
 *  2. Per-event .ics download (downloadIcs)
 *     - Opens in Apple Calendar, Outlook desktop, anything ICS-aware.
 *
 *  3. ONE-WAY SUBSCRIPTION FEED (buildIcsFeed + subscribeUrls)
 *     - The /api/calendar/feed endpoint serves a live iCal feed of all
 *       community events. Calendar apps that subscribe to that URL
 *       poll it periodically (Google ~24h, Apple/Outlook configurable)
 *       and automatically pick up new/edited/cancelled events.
 *     - Read-only on the user's side: they cannot push events back
 *       into the community calendar, by design.
 *     - No OAuth, no API key - just a public URL + the calendar app's
 *       built-in "subscribe by URL" flow.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Format a Date as YYYYMMDDTHHMMSSZ (no separators) for ICS / GCal. */
function toIcsTimestamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** Format a Date as YYYYMMDD (UTC) for VALUE=DATE all-day fields. */
function toIcsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/**
 * Build a UTC Date from a YYYY-MM-DD string + optional HH:mm time.
 *
 * The wall-clock time the organizer typed (e.g. "19:00") is treated as
 * UTC verbatim — we do NOT apply the runtime's local offset. This keeps
 * the output identical whether the helper runs in the browser
 * (per-event deeplinks) or on the server (the /api/calendar/feed route),
 * so events never silently shift by a day or by the host's offset.
 */
function utcDate(ymd: string, time?: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  let hh = 0;
  let mm = 0;
  if (time && TIME_RE.test(time)) {
    [hh, mm] = time.split(":").map(Number);
  }
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
}

interface ResolvedTimes {
  /** True when the event has no start time → iCal VALUE=DATE form. */
  allDay: boolean;
  start: Date;
  /** Exclusive end (RFC 5545). For all-day, the day AFTER the last day. */
  end: Date;
}

/**
 * Normalize an event's date/time fields into concrete start/end Dates,
 * collapsing the four cases (all-day single, all-day multi, timed
 * single, timed multi-day) into one consistent shape.
 */
function resolveTimes(event: CalendarEvent): ResolvedTimes {
  const startYmd = DATE_RE.test(event.date) ? event.date : event.date.slice(0, 10);
  const endYmd =
    event.endDate && DATE_RE.test(event.endDate) ? event.endDate : undefined;
  const allDay = !event.startTime || !TIME_RE.test(event.startTime);

  if (allDay) {
    const start = utcDate(startYmd);
    // DTEND is exclusive for all-day events, so it must be the day
    // AFTER the final day the event covers (endDate ?? startDate).
    const lastDay = utcDate(endYmd ?? startYmd);
    const end = new Date(lastDay.getTime() + 24 * 60 * 60 * 1000);
    return { allDay: true, start, end };
  }

  const start = utcDate(startYmd, event.startTime);
  let end: Date;
  if (event.endTime && TIME_RE.test(event.endTime)) {
    // Timed event: end on endDate (if multi-day) else same day.
    end = utcDate(endYmd ?? startYmd, event.endTime);
    // Guard against an end that lands at/before start (bad data).
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
  } else if (endYmd && endYmd !== startYmd) {
    // Multi-day event with a start time but no explicit end time:
    // run it to 17:00 on the final day rather than a 1-hour stub.
    end = utcDate(endYmd, "17:00");
  } else {
    // Single timed event, no end time → default 1-hour duration.
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }
  return { allDay: false, start, end };
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const { allDay, start, end } = resolveTimes(event);
  // Google uses YYYYMMDD/YYYYMMDD for all-day (end exclusive) and
  // YYYYMMDDTHHMMSSZ/... for timed events.
  const dates = allDay
    ? `${toIcsDate(start)}/${toIcsDate(end)}`
    : `${toIcsTimestamp(start)}/${toIcsTimestamp(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details: event.description || "",
    location: event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: CalendarEvent): string {
  const { allDay, start, end } = resolveTimes(event);
  const params = new URLSearchParams({
    rru: "addevent",
    path: "/calendar/action/compose",
    subject: event.title,
    // Outlook's compose deeplink accepts ISO datetimes; for all-day it
    // wants the flag plus date-only bounds (end exclusive).
    startdt: allDay ? toIsoDateOnly(start) : start.toISOString(),
    enddt: allDay ? toIsoDateOnly(end) : end.toISOString(),
    body: event.description || "",
    location: event.location || "",
  });
  if (allDay) params.set("allday", "true");
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** YYYY-MM-DD slice of a UTC date, for Outlook all-day bounds. */
function toIsoDateOnly(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Wrap long lines at 75 octets per RFC 5545. Continuation lines start
 * with a single space.
 */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + 75);
    parts.push(i === 0 ? chunk : ` ${chunk}`);
    i += 75;
  }
  return parts.join("\r\n");
}

function buildVEvent(event: CalendarEvent, stamp: string): string[] {
  const { allDay, start, end } = resolveTimes(event);
  const uid = `${event.id}@amigasymassocial.com`;
  // All-day → VALUE=DATE with an exclusive DTEND (day after the last
  // day). Timed → UTC instants with a trailing Z. Never emit an empty
  // or null time.
  const dtStart = allDay
    ? `DTSTART;VALUE=DATE:${toIcsDate(start)}`
    : `DTSTART:${toIcsTimestamp(start)}`;
  const dtEnd = allDay
    ? `DTEND;VALUE=DATE:${toIcsDate(end)}`
    : `DTEND:${toIcsTimestamp(end)}`;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    dtStart,
    dtEnd,
    foldIcsLine(`SUMMARY:${escapeIcs(event.title)}`),
    foldIcsLine(`DESCRIPTION:${escapeIcs(event.description || "")}`),
    foldIcsLine(`LOCATION:${escapeIcs(event.location || "")}`),
    "END:VEVENT",
  ];
}

export function buildIcsFile(event: CalendarEvent): string {
  const stamp = toIcsTimestamp(new Date());
  // CRLF line endings are required by RFC 5545.
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AYMS//Community Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...buildVEvent(event, stamp),
    "END:VCALENDAR",
    "",
  ];
  return lines.join("\r\n");
}

/**
 * Build a multi-event iCalendar feed - the format calendar apps
 * subscribe to. Includes X-WR-* hints so subscribers see a useful
 * calendar name + suggested refresh cadence.
 */
export function buildIcsFeed(
  events: CalendarEvent[],
  options: { name?: string; description?: string } = {},
): string {
  const stamp = toIcsTimestamp(new Date());
  const name = options.name ?? "AYMS Community Events";
  const desc =
    options.description ??
    "Upcoming AYMS trips, meetups, camp dates, and social events.";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AYMS//Community Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${escapeIcs(name)}`),
    foldIcsLine(`X-WR-CALDESC:${escapeIcs(desc)}`),
    "X-APPLE-CALENDAR-COLOR:#FFB7C5",
    "COLOR:pink",
    // Suggest a 1-hour refresh cadence; calendar apps treat this as
    // a hint and clamp to their own minimum (Google's is several hours).
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap((e) => buildVEvent(e, stamp)),
    "END:VCALENDAR",
    "",
  ];
  return lines.join("\r\n");
}

/**
 * Public, absolute URL of the iCal feed - required for both the Google
 * subscribe deeplink and the webcal:// URL.
 */
export function calendarFeedUrl(baseUrl: string): string {
  const clean = baseUrl.replace(/\/+$/, "");
  return `${clean}/api/calendar/feed`;
}

/**
 * Google Calendar "Add by URL" deeplink. Pre-fills the URL field on
 * https://calendar.google.com/calendar/u/0/r/settings/addbyurl. The
 * `cid` shortcut works when the URL is webcal:// (Google strips the
 * scheme client-side).
 */
export function googleSubscribeUrl(baseUrl: string): string {
  // Use the plain webcal URL without extra params so Google's URL
  // hash stays stable (adding ?name= changed the hash and shifted
  // Google's default color assignment away from the original pink).
  const webcal = calendarFeedUrl(baseUrl).replace(/^https?:\/\//, "webcal://");
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
}

/**
 * Apple Calendar / Outlook desktop / most clients understand the
 * webcal:// scheme natively - clicking the link prompts the user to
 * subscribe. The ?name= param hints the display name for Apple.
 */
export function webcalSubscribeUrl(baseUrl: string): string {
  const url = calendarFeedUrl(baseUrl).replace(/^https?:\/\//, "webcal://");
  return `${url}?name=${encodeURIComponent("AYMS Community Events")}`;
}

/**
 * Outlook.com web subscribe deeplink (fallback for users not on
 * Outlook desktop).
 */
export function outlookSubscribeUrl(baseUrl: string): string {
  const feed = calendarFeedUrl(baseUrl);
  const params = new URLSearchParams({
    url: feed,
    name: "AYMS Community Events",
  });
  return `https://outlook.live.com/calendar/0/addfromweb/?${params.toString()}`;
}

export function downloadIcs(event: CalendarEvent): void {
  if (typeof window === "undefined") return;
  const ics = buildIcsFile(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Allow the click to dispatch before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
