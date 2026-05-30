import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/calendar/sync
 *
 * Fetches every enabled iCal feed, parses the events, upserts them
 * into Firestore, and deletes orphans.
 *
 * Uses the Firestore REST API (not the client SDK) because the
 * client SDK requires a persistent WebSocket which can't be
 * established from a short-lived serverless function.
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
function toFSBool(v: boolean): FSValue {
  return { booleanValue: v };
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

async function fsGet(path: string): Promise<FSDocument | null> {
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET ${path}: ${res.status}`);
  return res.json();
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

async function fsCreate(
  collectionPath: string,
  docId: string,
  fields: Record<string, FSValue>,
): Promise<void> {
  const res = await fetch(
    `${FIRESTORE_BASE}/${collectionPath}?documentId=${encodeURIComponent(docId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    },
  );
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    throw new Error(`Firestore CREATE ${collectionPath}/${docId}: ${res.status} ${text}`);
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
        });
      }
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const keyPart = trimmed.slice(0, colonIdx).toUpperCase();
    const value = trimmed.slice(colonIdx + 1);
    const key = keyPart.split(";")[0];

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
        break;
      case "DTEND":
        current.dtend = value;
        break;
    }
  }
  return events;
}

function icalDateToYMD(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 8) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/** Extract HH:mm time from an iCal datetime like 20260524T190000Z. */
function icalDateToTime(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 12) return "";
  return `${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
}

/* ------------------------------------------------------------------ */
/* Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

      try {
        // 2. Fetch + parse iCal
        console.debug("[calendar-sync]", configName, "fetching:", icalUrl.slice(0, 80));
        const response = await fetch(icalUrl, {
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        console.debug("[calendar-sync]", configName, "length:", text.length, "starts:", text.slice(0, 30));
        const parsed = parseICalText(text);
        console.debug("[calendar-sync]", configName, "parsed:", parsed.length, "events");

        // 3. Map to event shape
        const feedEvents = parsed
          .map((ev) => ({
            uid: ev.uid,
            title: ev.summary,
            description: ev.description,
            date: icalDateToYMD(ev.dtstart),
            endDate: icalDateToYMD(ev.dtend),
            startTime: icalDateToTime(ev.dtstart),
            endTime: icalDateToTime(ev.dtend),
            location: ev.location,
          }))
          .filter((e) => e.date);

        // 4. Upsert events
        let upserted = 0;
        const feedUids = new Set<string>();
        for (const fe of feedEvents) {
          feedUids.add(fe.uid);
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
