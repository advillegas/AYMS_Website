"use client";

/**
 * Firestore-backed community events with realtime subscription,
 * CRUD mutations, and automatic seed migration from the static
 * COMMUNITY_EVENTS array.
 *
 * Replaces the old read-only Zustand store so the calendar page,
 * marketing events page, and admin panel all share the same live
 * data.
 *
 * When Firestore isn't configured the hook falls back to the static
 * seed data so the marketing site still renders events.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import {
  COMMUNITY_EVENTS,
  type CalendarEvent,
} from "./events-data";

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
    sourceCalendarId: data.sourceCalendarId,
    sourceUid: data.sourceUid,
    syncedAt: tsToIso(data.syncedAt),
    createdBy: data.createdBy,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

/* ------------------------------------------------------------------ */
/* Seed migration                                                      */
/* ------------------------------------------------------------------ */

let seeded = false;

async function seedIfEmpty(): Promise<void> {
  if (seeded || !isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  seeded = true;
  try {
    const snap = await getDocs(
      query(collection(db, "events"), limit(1)),
    );
    if (!snap.empty) return;
    for (const ev of COMMUNITY_EVENTS) {
      await setDoc(doc(db, "events", ev.id), {
        title: ev.title,
        description: ev.description,
        date: ev.date,
        endDate: ev.endDate ?? null,
        type: ev.type,
        location: ev.location,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    console.debug("[events] seeded Firestore with COMMUNITY_EVENTS");
  } catch (err) {
    console.warn("[events] seed failed", err);
    seeded = false;
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
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const isFirestore = isFirebaseConfigured;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setEvents(
        COMMUNITY_EVENTS.map((e) => ({
          ...e,
          type: e.type as EventType,
        })),
      );
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    void seedIfEmpty();
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
        setEvents(
          COMMUNITY_EVENTS.map((e) => ({
            ...e,
            type: e.type as EventType,
          })),
        );
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
    createdBy: data.createdBy ?? "",
    createdAt: tsToIso(data.createdAt),
  };
}

export function useSyncConfigs(): {
  configs: CalendarSyncConfig[];
  loading: boolean;
  addConfig: (c: Omit<CalendarSyncConfig, "id" | "createdAt">) => Promise<string | null>;
  updateConfig: (id: string, patch: Partial<CalendarSyncConfig>) => Promise<boolean>;
  deleteConfig: (id: string) => Promise<boolean>;
} {
  const [configs, setConfigs] = useState<CalendarSyncConfig[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) { setLoading(false); return; }
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
