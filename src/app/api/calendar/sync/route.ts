import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseBackend } from "@/lib/supabase";
import { getServiceClient } from "@/lib/supabase-server";

/**
 * POST /api/calendar/sync
 *
 * Fetches every enabled iCal feed, parses the events, upserts them
 * into the backing store, and deletes orphans.
 *
 * Under the Supabase backend this uses a service-role server client
 * (RLS denies anon event writes). Otherwise it uses the Firestore
 * REST API (not the client SDK) because the client SDK requires a
 * persistent WebSocket which can't be established from a short-lived
 * serverless function.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/* ------------------------------------------------------------------ */
/* Firestore REST helpers                                              */
/* ------------------------------------------------------------------ */

interface FSValue {
  stringValue?: string;
  integerValue?: string;
  booleanValue?: boolean;
  nullValue?: string;
  timestampValue?: string;
  mapValue?: { fields: Record<string, FSValue> };
  arrayValue?: { values?: FSValue[] };
}

interface FSDocument {
  name: string;
  fields: Record<string, FSValue>;
}

function toFSString(v: string): FSValue {
  return { stringValue: v };
}
function toFSInt(v: number): FSValue {
  return { integerValue: String(v) };
}
function toFSTimestamp(): FSValue {
  return { timestampValue: new Date().toISOString() };
}
function toFSNull(): FSValue {
  return { nullValue: "NULL_VALUE" };
}
function fromFSString(v: FSValue | undefined): string {
  return v?.stringValue ?? "";
}
function fromFSBool(v: FSValue | undefined): boolean {
  return v?.booleanValue ?? false;
}
function fromFSStringArray(v: FSValue | undefined): string[] {
  const values = v?.arrayValue?.values ?? [];
  return values
    .map((x) => x.stringValue)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}

async function fsList(
  collectionPath: string,
  pageSize = 100,
): Promise<FSDocument[]> {
  const res = await fetch(
    `${FIRESTORE_BASE}/${collectionPath}?pageSize=${pageSize}`,
    { headers: { "Content-Type": "application/json" } },
  );
  if (!res.ok) throw new Error(`Firestore LIST ${collectionPath}: ${res.status}`);
  const data = await res.json();
  return (data.documents ?? []) as FSDocument[];
}

async function fsPatch(
  path: string,
  fields: Record<string, FSValue>,
): Promise<void> {
  const masks = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const res = await fetch(`${FIRESTORE_BASE}/${path}?${masks}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore PATCH ${path}: ${res.status} ${text}`);
  }
}

async function fsUpsert(
  path: string,
  fields: Record<string, FSValue>,
): Promise<void> {
  // PATCH with all fields = create-or-update
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore UPSERT ${path}: ${res.status} ${text}`);
  }
}

async function fsDelete(path: string): Promise<void> {
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Firestore DELETE ${path}: ${res.status}`);
  }
}

/* ------------------------------------------------------------------ */
/* iCal parser (same as before)                                        */
/* ------------------------------------------------------------------ */

interface ParsedVEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  dtstart: string;
  dtend: string;
  /** iCal property parameters (e.g. "TZID=America/Los_Angeles" or
   *  "VALUE=DATE") preserved so the date/time can be resolved against
   *  the event's own timezone instead of being read as raw UTC. */
  dtstartParams: string;
  dtendParams: string;
}

function parseICalText(text: string): ParsedVEvent[] {
  const events: ParsedVEvent[] = [];
  const unfolded = text
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "")
    .replace(/\r/g, "");
  const lines = unfolded.split("\n");

  let inEvent = false;
  let current: Partial<ParsedVEvent> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (trimmed === "END:VEVENT") {
      inEvent = false;
      if (current.uid && current.dtstart) {
        events.push({
          uid: current.uid,
          summary: current.summary ?? "Untitled",
          description: current.description ?? "",
          location: current.location ?? "",
          dtstart: current.dtstart,
          dtend: current.dtend ?? "",
          dtstartParams: current.dtstartParams ?? "",
          dtendParams: current.dtendParams ?? "",
        });
      }
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const keyPart = trimmed.slice(0, colonIdx).toUpperCase();
    const value = trimmed.slice(colonIdx + 1);
    const semiIdx = keyPart.indexOf(";");
    const key = semiIdx === -1 ? keyPart : keyPart.slice(0, semiIdx);
    const params = semiIdx === -1 ? "" : keyPart.slice(semiIdx + 1);

    switch (key) {
      case "UID":
        current.uid = value;
        break;
      case "SUMMARY":
        current.summary = value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
        break;
      case "DESCRIPTION":
        current.description = value
          .replace(/\\n/g, "\n")
          .replace(/\\,/g, ",")
          .slice(0, 500);
        break;
      case "LOCATION":
        current.location = value.replace(/\\,/g, ",");
        break;
      case "DTSTART":
        current.dtstart = value;
        current.dtstartParams = params;
        break;
      case "DTEND":
        current.dtend = value;
        current.dtendParams = params;
        break;
    }
  }
  return events;
}

/**
 * Display timezone for events whose iCal time is in UTC (a trailing
 * "Z") with no TZID — i.e. the feed gives us an absolute instant but
 * no intended local zone. AYMS is California-based, so we render those
 * in Pacific. Events that DO carry a TZID keep their own local
 * wall-clock time (honored per-event); floating times are used as-is.
 */
const DEFAULT_TZ = "America/Los_Angeles";

/** Format an absolute Date into {date,time} parts for a given IANA zone. */
function zonedParts(date: Date, timeZone: string): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  if (!map.year) return { date: "", time: "" };
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
  };
}

/**
 * Resolve an iCal DTSTART/DTEND value (+ its property params) into the
 * local calendar date and HH:mm to store/display.
 *
 *  - VALUE=DATE / date-only (no "T"): all-day → date, no time.
 *  - Trailing "Z" (UTC instant) with no TZID: convert to DEFAULT_TZ.
 *  - TZID=… present: the digits are already the event's local wall
 *    time in that zone → use them directly (honors per-event TZID).
 *  - Floating (no Z, no TZID): treat as local wall time → use directly.
 */
function resolveICalDateTime(
  rawValue: string,
  params: string,
): { date: string; time: string } {
  const value = rawValue.trim();
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length < 8) return { date: "", time: "" };
  const ymd = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;

  const isDateOnly =
    !value.includes("T") || /VALUE=DATE(?!-TIME)/i.test(params);
  if (isDateOnly || digits.length < 12) {
    return { date: ymd, time: "" };
  }

  const isUtc = /Z$/i.test(value);
  // UTC instant with no explicit zone → render in the fallback zone.
  if (isUtc && !/TZID=/i.test(params)) {
    const utc = new Date(
      Date.UTC(
        Number(digits.slice(0, 4)),
        Number(digits.slice(4, 6)) - 1,
        Number(digits.slice(6, 8)),
        Number(digits.slice(8, 10)),
        Number(digits.slice(10, 12)),
      ),
    );
    const z = zonedParts(utc, DEFAULT_TZ);
    if (z.date) return z;
  }

  // TZID-qualified or floating: the wall-clock digits are the intended
  // local time — keep them as-is.
  return { date: ymd, time: `${digits.slice(8, 10)}:${digits.slice(10, 12)}` };
}

/* ------------------------------------------------------------------ */
/* Feed URL validation (SSRF guard)                                    */
/* ------------------------------------------------------------------ */

/**
 * SSRF guard: feed URLs are admin-configured, but defense-in-depth —
 * never fetch private/loopback/metadata hosts (same blocklist as
 * /api/og). A compromised admin account or poisoned config must not
 * be able to pivot this server into the internal network.
 */
function checkFeedUrl(icalUrl: string): { url: URL } | { error: string } {
  let feedUrl: URL;
  try {
    feedUrl = new URL(icalUrl);
  } catch {
    return { error: "Invalid iCal URL" };
  }
  const feedHost = feedUrl.hostname.toLowerCase();
  if (
    (feedUrl.protocol !== "http:" && feedUrl.protocol !== "https:") ||
    feedHost === "localhost" ||
    feedHost === "127.0.0.1" ||
    feedHost === "::1" ||
    feedHost.endsWith(".local") ||
    feedHost.startsWith("10.") ||
    feedHost.startsWith("192.168.") ||
    feedHost.startsWith("169.254.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(feedHost)
  ) {
    return { error: "iCal host not allowed" };
  }
  return { url: feedUrl };
}

/* ------------------------------------------------------------------ */
/* Supabase sync (service role)                                        */
/* ------------------------------------------------------------------ */

interface SyncConfigRow {
  id: string;
  name: string | null;
  ical_url: string | null;
  enabled: boolean | null;
  /** Optional until supabase/events-suppression.sql is applied. */
  suppressed_uids?: string[] | null;
}

interface SyncResult {
  configId: string;
  name: string;
  upserted: number;
  deleted: number;
  error?: string;
}

/**
 * cms_config key holding FALLBACK tombstones written by the client while
 * the calendar_sync_configs.suppressed_uids column is missing (i.e. until
 * supabase/events-suppression.sql has been applied). Shape:
 * { [configId]: string[] }. Kept in sync with use-events-supabase.ts.
 */
const SUPPRESSED_UIDS_CONFIG_KEY = "events.suppressedUids";

async function loadFallbackSuppressed(
  svc: SupabaseClient,
): Promise<Record<string, string[]>> {
  try {
    const { data } = await svc
      .from("cms_config")
      .select("value")
      .eq("key", SUPPRESSED_UIDS_CONFIG_KEY)
      .maybeSingle();
    const value = (data as { value?: unknown } | null)?.value;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        out[k] = v.filter((s): s is string => typeof s === "string");
      }
    }
    return out;
  } catch {
    // cms_config missing or unreadable — the primary column still applies.
    return {};
  }
}

async function syncViaSupabase(): Promise<NextResponse> {
  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 },
    );
  }

  try {
    // 1. Read all sync configs. select("*") (not an explicit column list)
    // so this keeps working before the optional suppressed_uids column
    // migration has been applied.
    const { data: configRows, error: configErr } = await svc
      .from("calendar_sync_configs")
      .select("*");
    if (configErr) throw new Error(configErr.message);
    const configs = (configRows ?? []) as SyncConfigRow[];
    console.debug("[calendar-sync] found", configs.length, "config rows");

    if (configs.length === 0) {
      return NextResponse.json({ synced: 0, message: "No feeds configured" });
    }

    // Fallback tombstones (cms_config) — merged with each config's own
    // suppressed_uids so admin deletes stick even before the suppression
    // SQL has been applied to this database.
    const fallbackSuppressed = await loadFallbackSuppressed(svc);

    const results: SyncResult[] = [];

    for (const config of configs) {
      const configId = config.id;
      const configName = config.name ?? "";
      const icalUrl = config.ical_url ?? "";
      // Feed UIDs the admin deleted or detached — never re-create them.
      const suppressed = new Set([
        ...(Array.isArray(config.suppressed_uids) ? config.suppressed_uids : []),
        ...(fallbackSuppressed[configId] ?? []),
      ]);

      if (!config.enabled) {
        console.debug("[calendar-sync] skipping disabled:", configName);
        continue;
      }
      if (!icalUrl) {
        results.push({ configId, name: configName, upserted: 0, deleted: 0, error: "No iCal URL" });
        continue;
      }

      const checked = checkFeedUrl(icalUrl);
      if ("error" in checked) {
        results.push({ configId, name: configName, upserted: 0, deleted: 0, error: checked.error });
        continue;
      }

      try {
        // 2. Fetch + parse iCal
        console.debug("[calendar-sync]", configName, "fetching:", icalUrl.slice(0, 80));
        const response = await fetch(checked.url.toString(), {
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        console.debug("[calendar-sync]", configName, "length:", text.length, "starts:", text.slice(0, 30));
        const parsed = parseICalText(text);
        console.debug("[calendar-sync]", configName, "parsed:", parsed.length, "events");

        // 3. Map to event rows (snake_case, matching use-events-supabase)
        const feedEvents = parsed
          .map((ev) => {
            const start = resolveICalDateTime(ev.dtstart, ev.dtstartParams);
            const end = resolveICalDateTime(ev.dtend, ev.dtendParams);
            return {
              uid: ev.uid,
              title: ev.summary,
              description: ev.description,
              date: start.date,
              endDate: end.date,
              startTime: start.time,
              endTime: end.time,
              location: ev.location,
            };
          })
          .filter((e) => e.date);

        const nowIso = new Date().toISOString();
        const feedUids = new Set<string>();
        // Keyed by id: uids that sanitize to the same id must collapse to
        // one row (a batch upsert can't touch the same row twice), matching
        // the sequential last-write-wins of the Firestore branch.
        const rowById = new Map<string, Record<string, unknown>>();
        for (const fe of feedEvents) {
          feedUids.add(fe.uid);
          // Tombstoned by an admin delete/edit — skip the upsert entirely.
          // (Still counted in feedUids so the orphan pass leaves any
          // detached manual copy alone.)
          if (suppressed.has(fe.uid)) continue;
          const eventId = `sync-${configId}-${fe.uid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)}`;
          rowById.set(eventId, {
            id: eventId,
            title: fe.title,
            description: fe.description,
            date: fe.date,
            end_date: fe.endDate || null,
            start_time: fe.startTime || null,
            end_time: fe.endTime || null,
            type: "synced",
            location: fe.location,
            source_calendar_id: configId,
            source_uid: fe.uid,
            synced_at: nowIso,
            updated_at: nowIso,
          });
        }

        // 4. Upsert events (one batch per feed)
        const rows = [...rowById.values()];
        if (rows.length > 0) {
          const { error: upsertErr } = await svc
            .from("events")
            .upsert(rows, { onConflict: "id" });
          if (upsertErr) throw new Error(upsertErr.message);
        }
        const upserted = rows.length;

        // 5. Delete orphans — only rows this feed wrote (source_uid set;
        // manual events are untouchable)
        const { data: existingRows, error: existingErr } = await svc
          .from("events")
          .select("id, source_uid")
          .eq("source_calendar_id", configId)
          .not("source_uid", "is", null);
        if (existingErr) throw new Error(existingErr.message);
        const orphanIds = ((existingRows ?? []) as Array<{ id: string; source_uid: string | null }>)
          .filter((r) => r.source_uid && !feedUids.has(r.source_uid))
          .map((r) => r.id);
        let deleted = 0;
        for (let i = 0; i < orphanIds.length; i += 100) {
          const chunk = orphanIds.slice(i, i + 100);
          const { error: delErr } = await svc.from("events").delete().in("id", chunk);
          if (delErr) throw new Error(delErr.message);
          deleted += chunk.length;
        }

        // 6. Update config status
        const { error: statusErr } = await svc
          .from("calendar_sync_configs")
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_error: null,
            last_sync_count: feedEvents.length,
          })
          .eq("id", configId);
        if (statusErr) throw new Error(statusErr.message);

        results.push({ configId, name: configName, upserted, deleted });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[calendar-sync] ${configName} failed:`, err);
        try {
          await svc
            .from("calendar_sync_configs")
            .update({
              last_sync_at: new Date().toISOString(),
              last_sync_error: msg,
            })
            .eq("id", configId);
        } catch { /* ignore */ }
        results.push({ configId, name: configName, upserted: 0, deleted: 0, error: msg });
      }
    }

    return NextResponse.json({ synced: results.length, results });
  } catch (err) {
    console.error("[calendar-sync] top-level:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  // Default-deny: this endpoint triggers writes (event upserts/deletes), so it
  // must never be callable anonymously. If no CRON_SECRET is configured we
  // refuse rather than fall through to an unauthenticated sync — the operator
  // must set CRON_SECRET to enable scheduled syncing.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Calendar sync is not configured (CRON_SECRET unset)" },
      { status: 503 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (useSupabaseBackend) {
    return syncViaSupabase();
  }

  if (!PROJECT_ID) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FIREBASE_PROJECT_ID not set" },
      { status: 500 },
    );
  }

  try {
    // 1. Read all sync configs
    const configDocs = await fsList("calendarSyncConfigs");
    console.debug("[calendar-sync] found", configDocs.length, "config docs");

    if (configDocs.length === 0) {
      return NextResponse.json({ synced: 0, message: "No feeds configured" });
    }

    const results: Array<{
      configId: string;
      name: string;
      upserted: number;
      deleted: number;
      error?: string;
    }> = [];

    for (const configDoc of configDocs) {
      const f = configDoc.fields;
      const configName = fromFSString(f.name);
      const icalUrl = fromFSString(f.icalUrl);
      const enabled = fromFSBool(f.enabled);
      // Feed UIDs the admin deleted or detached — never re-create them.
      const suppressed = new Set(fromFSStringArray(f.suppressedUids));
      const docPath = configDoc.name.split("/documents/")[1];
      const configId = docPath?.split("/").pop() ?? "";

      if (!enabled) {
        console.debug("[calendar-sync] skipping disabled:", configName);
        continue;
      }
      if (!icalUrl) {
        results.push({ configId, name: configName, upserted: 0, deleted: 0, error: "No iCal URL" });
        continue;
      }

      const checked = checkFeedUrl(icalUrl);
      if ("error" in checked) {
        results.push({ configId, name: configName, upserted: 0, deleted: 0, error: checked.error });
        continue;
      }
      const feedUrl = checked.url;

      try {
        // 2. Fetch + parse iCal
        console.debug("[calendar-sync]", configName, "fetching:", icalUrl.slice(0, 80));
        const response = await fetch(feedUrl.toString(), {
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        console.debug("[calendar-sync]", configName, "length:", text.length, "starts:", text.slice(0, 30));
        const parsed = parseICalText(text);
        console.debug("[calendar-sync]", configName, "parsed:", parsed.length, "events");

        // 3. Map to event shape
        const feedEvents = parsed
          .map((ev) => {
            const start = resolveICalDateTime(ev.dtstart, ev.dtstartParams);
            const end = resolveICalDateTime(ev.dtend, ev.dtendParams);
            return {
              uid: ev.uid,
              title: ev.summary,
              description: ev.description,
              date: start.date,
              endDate: end.date,
              startTime: start.time,
              endTime: end.time,
              location: ev.location,
            };
          })
          .filter((e) => e.date);

        // 4. Upsert events
        let upserted = 0;
        const feedUids = new Set<string>();
        for (const fe of feedEvents) {
          feedUids.add(fe.uid);
          // Tombstoned by an admin delete/edit — skip the upsert entirely.
          if (suppressed.has(fe.uid)) continue;
          const eventId = `sync-${configId}-${fe.uid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)}`;
          await fsUpsert(`events/${eventId}`, {
            title: toFSString(fe.title),
            description: toFSString(fe.description),
            date: toFSString(fe.date),
            endDate: fe.endDate ? toFSString(fe.endDate) : toFSNull(),
            startTime: fe.startTime ? toFSString(fe.startTime) : toFSNull(),
            endTime: fe.endTime ? toFSString(fe.endTime) : toFSNull(),
            type: toFSString("synced"),
            location: toFSString(fe.location),
            sourceCalendarId: toFSString(configId),
            sourceUid: toFSString(fe.uid),
            syncedAt: toFSTimestamp(),
            updatedAt: toFSTimestamp(),
          });
          upserted++;
        }

        // 5. Delete orphans
        const existingDocs = await fsList("events", 500);
        let deleted = 0;
        for (const existingDoc of existingDocs) {
          const ef = existingDoc.fields;
          const srcCalId = fromFSString(ef.sourceCalendarId);
          const srcUid = fromFSString(ef.sourceUid);
          if (srcCalId === configId && srcUid && !feedUids.has(srcUid)) {
            const evPath = existingDoc.name.split("/documents/")[1];
            if (evPath) {
              await fsDelete(evPath);
              deleted++;
            }
          }
        }

        // 6. Update config status
        await fsPatch(docPath!, {
          lastSyncAt: toFSTimestamp(),
          lastSyncError: toFSNull(),
          lastSyncCount: toFSInt(feedEvents.length),
        });

        results.push({ configId, name: configName, upserted, deleted });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[calendar-sync] ${configName} failed:`, err);
        try {
          if (docPath) {
            await fsPatch(docPath, {
              lastSyncAt: toFSTimestamp(),
              lastSyncError: toFSString(msg),
            });
          }
        } catch { /* ignore */ }
        results.push({ configId, name: configName, upserted: 0, deleted: 0, error: msg });
      }
    }

    return NextResponse.json({ synced: results.length, results });
  } catch (err) {
    console.error("[calendar-sync] top-level:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
