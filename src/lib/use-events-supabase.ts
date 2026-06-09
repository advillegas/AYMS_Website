"use client";

/**
 * Supabase implementations of useEvents + useSyncConfigs. Delegated to
 * from use-events.ts when useSupabaseBackend is on. Same return shapes
 * as the Firestore versions so consumers are untouched.
 */

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery, tsToIso } from "./supabase-helpers";
import {
  COMMUNITY_EVENTS,
  type CalendarEvent,
} from "./events-data";
import type {
  EventType,
  FirestoreEvent,
  UseEventsResult,
  CalendarSyncConfig,
} from "./use-events";

interface EventRow {
  id: string;
  title: string;
  description: string;
  date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  type: string;
  location: string;
  source_calendar_id: string | null;
  source_uid: string | null;
  synced_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function rowToEvent(r: EventRow): FirestoreEvent {
  return {
    id: r.id,
    title: r.title ?? "",
    description: r.description ?? "",
    date: r.date ?? "",
    endDate: r.end_date ?? undefined,
    startTime: r.start_time ?? undefined,
    endTime: r.end_time ?? undefined,
    type: (r.type as EventType) ?? "social",
    location: r.location ?? "",
    sourceCalendarId: r.source_calendar_id ?? undefined,
    sourceUid: r.source_uid ?? undefined,
    syncedAt: tsToIso(r.synced_at),
    createdBy: r.created_by ?? undefined,
    createdAt: tsToIso(r.created_at),
    updatedAt: tsToIso(r.updated_at),
  };
}

let seeded = false;
async function seedIfEmpty(): Promise<void> {
  if (seeded) return;
  const sb = getSupabase();
  if (!sb) return;
  seeded = true;
  try {
    const { count } = await sb
      .from("events")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return;
    const rows = COMMUNITY_EVENTS.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      end_date: e.endDate ?? null,
      type: e.type,
      location: e.location,
    }));
    await sb.from("events").upsert(rows);
  } catch (err) {
    console.warn("[events:sb] seed failed", err);
    seeded = false;
  }
}

export function useEventsSupabase(): UseEventsResult {
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void seedIfEmpty();
    const unsub = subscribeQuery<EventRow>(
      "events",
      (sb) => sb.from("events").select("*").limit(500),
      (rows) => {
        setEvents(
          rows
            .map(rowToEvent)
            .filter((e) => e.date)
            .sort((a, b) => a.date.localeCompare(b.date)),
        );
        setLoading(false);
      },
      (msg) => {
        console.warn("[events:sb] query failed", msg);
        setEvents(
          COMMUNITY_EVENTS.map((e) => ({ ...e, type: e.type as EventType })),
        );
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const addEvent = useCallback(
    async (
      ev: Omit<FirestoreEvent, "id" | "createdAt" | "updatedAt">,
    ): Promise<string | null> => {
      const sb = getSupabase();
      if (!sb) return null;
      const id = `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await sb.from("events").insert({
        id,
        title: ev.title,
        description: ev.description,
        date: ev.date,
        end_date: ev.endDate ?? null,
        start_time: ev.startTime ?? null,
        end_time: ev.endTime ?? null,
        type: ev.type,
        location: ev.location,
        source_calendar_id: ev.sourceCalendarId ?? null,
        source_uid: ev.sourceUid ?? null,
        created_by: ev.createdBy ?? null,
      });
      if (error) {
        console.error("[events:sb] add failed", error.message);
        return null;
      }
      return id;
    },
    [],
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<FirestoreEvent>): Promise<boolean> => {
      const sb = getSupabase();
      if (!sb) return false;
      const map: Record<string, keyof EventRow> = {
        title: "title",
        description: "description",
        date: "date",
        endDate: "end_date",
        startTime: "start_time",
        endTime: "end_time",
        type: "type",
        location: "location",
        sourceCalendarId: "source_calendar_id",
        sourceUid: "source_uid",
        createdBy: "created_by",
      };
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const [k, v] of Object.entries(patch)) {
        const col = map[k];
        if (col) row[col] = v === undefined ? null : v;
      }
      const { error } = await sb.from("events").update(row).eq("id", id);
      if (error) {
        console.error("[events:sb] update failed", error.message);
        return false;
      }
      return true;
    },
    [],
  );

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb.from("events").delete().eq("id", id);
    if (error) {
      console.error("[events:sb] delete failed", error.message);
      return false;
    }
    return true;
  }, []);

  return { events, loading, isFirestore: true, addEvent, updateEvent, deleteEvent };
}

interface SyncRow {
  id: string;
  name: string;
  ical_url: string;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_sync_error: string | null;
  last_sync_count: number | null;
  enabled: boolean;
  created_by: string | null;
  created_at: string | null;
}

function rowToSync(r: SyncRow): CalendarSyncConfig {
  return {
    id: r.id,
    name: r.name ?? "",
    icalUrl: r.ical_url ?? "",
    syncIntervalMinutes: r.sync_interval_minutes ?? 30,
    lastSyncAt: tsToIso(r.last_sync_at),
    lastSyncError: r.last_sync_error ?? undefined,
    lastSyncCount: r.last_sync_count ?? undefined,
    enabled: r.enabled ?? true,
    createdBy: r.created_by ?? "",
    createdAt: tsToIso(r.created_at),
  };
}

export function useSyncConfigsSupabase(): {
  configs: CalendarSyncConfig[];
  loading: boolean;
  addConfig: (c: Omit<CalendarSyncConfig, "id" | "createdAt">) => Promise<string | null>;
  updateConfig: (id: string, patch: Partial<CalendarSyncConfig>) => Promise<boolean>;
  deleteConfig: (id: string) => Promise<boolean>;
} {
  const [configs, setConfigs] = useState<CalendarSyncConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeQuery<SyncRow>(
      "calendar_sync_configs",
      (sb) => sb.from("calendar_sync_configs").select("*").limit(50),
      (rows) => {
        setConfigs(rows.map(rowToSync));
        setLoading(false);
      },
      (msg) => {
        console.warn("[syncConfigs:sb] query failed", msg);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const addConfig = useCallback(
    async (c: Omit<CalendarSyncConfig, "id" | "createdAt">): Promise<string | null> => {
      const sb = getSupabase();
      if (!sb) return null;
      const id = `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await sb.from("calendar_sync_configs").insert({
        id,
        name: c.name,
        ical_url: c.icalUrl,
        sync_interval_minutes: c.syncIntervalMinutes,
        enabled: c.enabled,
        created_by: c.createdBy,
      });
      if (error) {
        console.error("[syncConfigs:sb] add failed", error.message);
        return null;
      }
      return id;
    },
    [],
  );

  const updateConfig = useCallback(
    async (id: string, patch: Partial<CalendarSyncConfig>): Promise<boolean> => {
      const sb = getSupabase();
      if (!sb) return false;
      const map: Record<string, string> = {
        name: "name",
        icalUrl: "ical_url",
        syncIntervalMinutes: "sync_interval_minutes",
        lastSyncAt: "last_sync_at",
        lastSyncError: "last_sync_error",
        lastSyncCount: "last_sync_count",
        enabled: "enabled",
        createdBy: "created_by",
      };
      const row: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        const col = map[k];
        if (col) row[col] = v === undefined ? null : v;
      }
      const { error } = await sb.from("calendar_sync_configs").update(row).eq("id", id);
      if (error) {
        console.error("[syncConfigs:sb] update failed", error.message);
        return false;
      }
      return true;
    },
    [],
  );

  const deleteConfig = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb.from("calendar_sync_configs").delete().eq("id", id);
    if (error) {
      console.error("[syncConfigs:sb] delete failed", error.message);
      return false;
    }
    return true;
  }, []);

  return { configs, loading, addConfig, updateConfig, deleteConfig };
}

export type { CalendarEvent };
