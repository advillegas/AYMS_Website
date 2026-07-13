"use client";

/**
 * Firestore-backed community events with realtime subscription and
 * CRUD mutations.
 *
 * The database is the ONLY source of events. There is deliberately no
 * auto-seeding and no static fallback list: when the admin deletes an
 * event it stays deleted, and an empty collection renders an empty
 * events page (see the empty state in events-body.tsx) instead of
 * resurrecting placeholder data.
 *
 * Synced (iCal) events get a tombstone when deleted or edited: their
 * feed UID is appended to `suppressedUids` on the owning
 * calendarSyncConfigs doc, which the /api/calendar/sync upsert honors,
 * so the 15-minute cron can never re-create them.
 */

import { useEffect, useState, useCallback } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
import { useSupabaseBackend } from "./supabase";
import {
  useEventsSupabase,
  useSyncConfigsSupabase,
} from "./use-events-supabase";
import { type CalendarEvent } from "./events-data";

export type { CalendarEvent };

/* ------------------------------------------------------------------ */
/* Firestore schema                                                    */
/* ------------------------------------------------------------------ */

export type EventType = CalendarEvent["type"] | "synced";

export interface FirestoreEvent extends CalendarEvent {
  type: EventType;
  sourceCalendarId?: string;
  sourceUid?: string;
  syncedAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FirestoreEventDoc {
  title?: string;
  description?: string;
  date?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  location?: string;
  capacity?: number | null;
  image?: string;
  link?: string;
  linkLabel?: string;
  lat?: number;
  lng?: number;
  published?: boolean;
  sourceCalendarId?: string;
  sourceUid?: string;
  syncedAt?: Timestamp;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function tsToIso(t: Timestamp | undefined | null): string {
  if (!t) return "";
  try {
    return t.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToEvent(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): FirestoreEvent {
  const data = d.data() as FirestoreEventDoc;
  return {
    id: d.id,
    title: data.title ?? "",
    description: data.description ?? "",
    date: data.date ?? "",
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    type: (data.type as EventType) ?? "social",
    location: data.location ?? "",
    capacity: data.capacity ?? undefined,
    image: data.image,
    link: data.link ?? undefined,
    linkLabel: data.linkLabel ?? undefined,
    lat: data.lat ?? undefined,
    lng: data.lng ?? undefined,
    published: data.published ?? undefined,
    sourceCalendarId: data.sourceCalendarId,
    sourceUid: data.sourceUid,
    syncedAt: tsToIso(data.syncedAt),
    createdBy: data.createdBy,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

/* ------------------------------------------------------------------ */
/* Sync tombstones                                                     */
/*                                                                     */
/* Deleting (or hand-editing) an event that came from an iCal feed     */
/* must survive the next cron sync. We record the feed UID on the      */
/* owning sync config doc; the sync route skips suppressed UIDs when   */
/* upserting. Firestore is schemaless so no migration is needed, and   */
/* calendarSyncConfigs is already admin-writable by the rules.         */
/* ------------------------------------------------------------------ */

async function suppressSyncUidFirebase(
  sourceCalendarId: string,
  sourceUid: string,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await updateDoc(doc(db, "calendarSyncConfigs", sourceCalendarId), {
      suppressedUids: arrayUnion(sourceUid),
    });
  } catch (err) {
    // Config may already be deleted (feed removed) — nothing to suppress.
    console.warn("[events] could not tombstone synced uid", err);
  }
}

/* ------------------------------------------------------------------ */
/* Public hook                                                         */
/* ------------------------------------------------------------------ */

export interface UseEventsResult {
  events: FirestoreEvent[];
  loading: boolean;
  isFirestore: boolean;
  addEvent: (ev: Omit<FirestoreEvent, "id" | "createdAt" | "updatedAt">) => Promise<string | null>;
  updateEvent: (id: string, patch: Partial<FirestoreEvent>) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
}

export function useEvents(): UseEventsResult {
  // House dual-backend dispatch: useSupabaseBackend is a build-time
  // constant, so hook order is stable for the life of the app.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSupabaseBackend ? useEventsSupabase() : useEventsFirebase();
}

function useEventsFirebase(): UseEventsResult {
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const isFirestore = isFirebaseConfigured;

  useEffect(() => {
    // No backend, no events — `events` initializes empty and `loading`
    // initializes false when Firebase isn't configured (getDb() is null
    // exactly then), so there's nothing to set here — and never phantom
    // placeholder data the admin can't delete.
    const db = getDb();
    if (!db) return;
    const q = query(collection(db, "events"), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToEvent)
          .filter((e) => e.date)
          .sort((a, b) => a.date.localeCompare(b.date));
        setEvents(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[events] snapshot failed", err);
        setEvents([]);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const addEvent = useCallback(
    async (
      ev: Omit<FirestoreEvent, "id" | "createdAt" | "updatedAt">,
    ): Promise<string | null> => {
      if (!isFirebaseConfigured) return null;
      const db = getDb();
      if (!db) return null;
      try {
        const ref = await addDoc(collection(db, "events"), {
          title: ev.title,
          description: ev.description,
          date: ev.date,
          endDate: ev.endDate ?? null,
          startTime: ev.startTime ?? null,
          endTime: ev.endTime ?? null,
          type: ev.type,
          location: ev.location,
          capacity: ev.capacity ?? null,
          image: ev.image ?? null,
          published: ev.published ?? true,
          sourceCalendarId: ev.sourceCalendarId ?? null,
          sourceUid: ev.sourceUid ?? null,
          createdBy: ev.createdBy ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return ref.id;
      } catch (err) {
        console.error("[events] add failed", err);
        return null;
      }
    },
    [],
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<FirestoreEvent>): Promise<boolean> => {
      if (!isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        const { id: _id, createdAt: _ca, ...rest } = patch;
        void _id;
        void _ca;
        // Firestore rejects `undefined` values — convert them to null
        // so the field is explicitly cleared instead of skipped.
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          cleaned[k] = v === undefined ? null : v;
        }
        cleaned.updatedAt = serverTimestamp();

        // Editing a feed-synced event detaches it into a manual event and
        // tombstones its UID — otherwise the next sync would overwrite the
        // admin's changes wholesale (the sync upsert replaces the doc).
        try {
          const snap = await getDoc(doc(db, "events", id));
          const data = snap.data() as FirestoreEventDoc | undefined;
          if (data?.sourceCalendarId && data?.sourceUid) {
            await suppressSyncUidFirebase(data.sourceCalendarId, data.sourceUid);
            cleaned.sourceCalendarId = null;
            cleaned.sourceUid = null;
          }
        } catch {
          /* detach is best-effort; the update below still applies */
        }

        await updateDoc(doc(db, "events", id), cleaned);
        return true;
      } catch (err) {
        console.error("[events] update failed", err);
        return false;
      }
    },
    [],
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        // Tombstone feed-synced events BEFORE deleting so the 15-minute
        // cron sync can never resurrect them.
        try {
          const snap = await getDoc(doc(db, "events", id));
          const data = snap.data() as FirestoreEventDoc | undefined;
          if (data?.sourceCalendarId && data?.sourceUid) {
            await suppressSyncUidFirebase(data.sourceCalendarId, data.sourceUid);
          }
        } catch {
          /* suppression is best-effort; deletion still proceeds */
        }
        await deleteDoc(doc(db, "events", id));
        return true;
      } catch (err) {
        console.error("[events] delete failed", err);
        return false;
      }
    },
    [],
  );

  return { events, loading, isFirestore, addEvent, updateEvent, deleteEvent };
}

/* ------------------------------------------------------------------ */
/* Sync config types (used by admin + sync route)                      */
/* ------------------------------------------------------------------ */

export interface CalendarSyncConfig {
  id: string;
  name: string;
  icalUrl: string;
  syncIntervalMinutes: number;
  lastSyncAt?: string;
  lastSyncError?: string;
  lastSyncCount?: number;
  enabled: boolean;
  /** Feed UIDs the admin deleted/detached — sync must never re-create these. */
  suppressedUids?: string[];
  createdBy: string;
  createdAt?: string;
}

interface FirestoreSyncConfigDoc {
  name?: string;
  icalUrl?: string;
  syncIntervalMinutes?: number;
  lastSyncAt?: Timestamp;
  lastSyncError?: string;
  lastSyncCount?: number;
  enabled?: boolean;
  suppressedUids?: string[];
  createdBy?: string;
  createdAt?: Timestamp;
}

function docToSyncConfig(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): CalendarSyncConfig {
  const data = d.data() as FirestoreSyncConfigDoc;
  return {
    id: d.id,
    name: data.name ?? "",
    icalUrl: data.icalUrl ?? "",
    syncIntervalMinutes: data.syncIntervalMinutes ?? 30,
    lastSyncAt: tsToIso(data.lastSyncAt),
    lastSyncError: data.lastSyncError,
    lastSyncCount: data.lastSyncCount,
    enabled: data.enabled ?? true,
    suppressedUids: Array.isArray(data.suppressedUids)
      ? data.suppressedUids
      : [],
    createdBy: data.createdBy ?? "",
    createdAt: tsToIso(data.createdAt),
  };
}

type UseSyncConfigsResult = {
  configs: CalendarSyncConfig[];
  loading: boolean;
  addConfig: (c: Omit<CalendarSyncConfig, "id" | "createdAt">) => Promise<string | null>;
  updateConfig: (id: string, patch: Partial<CalendarSyncConfig>) => Promise<boolean>;
  deleteConfig: (id: string) => Promise<boolean>;
};

export function useSyncConfigs(): UseSyncConfigsResult {
  // House dual-backend dispatch: useSupabaseBackend is a build-time
  // constant, so hook order is stable for the life of the app.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSupabaseBackend ? useSyncConfigsSupabase() : useSyncConfigsFirebase();
}

function useSyncConfigsFirebase(): UseSyncConfigsResult {
  const [configs, setConfigs] = useState<CalendarSyncConfig[]>([]);
  // Initializes false when Firebase isn't configured — no effect needed.
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    // getDb() is null exactly when Firebase isn't configured, and
    // `loading` already initialized false for that case.
    const db = getDb();
    if (!db) return;
    const q = query(collection(db, "calendarSyncConfigs"), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setConfigs(snap.docs.map(docToSyncConfig));
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[syncConfigs] snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const addConfig = useCallback(
    async (c: Omit<CalendarSyncConfig, "id" | "createdAt">): Promise<string | null> => {
      const db = getDb();
      if (!db) return null;
      try {
        const ref = await addDoc(collection(db, "calendarSyncConfigs"), {
          name: c.name,
          icalUrl: c.icalUrl,
          syncIntervalMinutes: c.syncIntervalMinutes,
          enabled: c.enabled,
          createdBy: c.createdBy,
          createdAt: serverTimestamp(),
        });
        return ref.id;
      } catch (err) {
        console.error("[syncConfigs] add failed", err);
        return null;
      }
    },
    [],
  );

  const updateConfig = useCallback(
    async (id: string, patch: Partial<CalendarSyncConfig>): Promise<boolean> => {
      const db = getDb();
      if (!db) return false;
      try {
        const { id: _id, createdAt: _ca, ...rest } = patch;
        void _id; void _ca;
        await updateDoc(doc(db, "calendarSyncConfigs", id), rest);
        return true;
      } catch (err) {
        console.error("[syncConfigs] update failed", err);
        return false;
      }
    },
    [],
  );

  const deleteConfig = useCallback(
    async (id: string): Promise<boolean> => {
      const db = getDb();
      if (!db) return false;
      try {
        await deleteDoc(doc(db, "calendarSyncConfigs", id));
        return true;
      } catch (err) {
        console.error("[syncConfigs] delete failed", err);
        return false;
      }
    },
    [],
  );

  return { configs, loading, addConfig, updateConfig, deleteConfig };
}
