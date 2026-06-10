"use client";

/**
 * Member-created local meetups backed by a flat Firestore collection
 * `meetups/{autoId}` → { title, description, date, startTime?, location,
 * lat, lng, hostId, hostName, hostAvatar?, capacity?, createdAt }.
 *
 * The host types a plain address/city; we geocode it to lat/lng via
 * geocodeLocation() (geo.ts) so the meetups page can sort by haversine
 * distance from the member's own location — the same geo model the
 * #local chat channel uses, now powering events too.
 *
 * Attendees are stored as RSVPs in the `meetups/{id}/rsvps` subcollection
 * (see use-rsvps.ts with targetType "meetup"), so meetups and events
 * share one attendee model.
 *
 * Meetups are also merged into the community calendar as type "meetup".
 *
 * When Firestore isn't configured every mutation is a graceful no-op
 * and the list stays empty (mirrors use-events.ts).
 */

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
import { getCurrentUid, getDb, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import { useMeetupsSupabase } from "./use-meetups-supabase";
import { useAuth } from "./store";
import { geocodeLocation } from "./geo";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Meetup {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  location: string;
  lat: number | null;
  lng: number | null;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  capacity?: number;
  createdAt: string;
}

/** Input for creating a meetup — lat/lng are resolved by the hook. */
export interface MeetupInput {
  title: string;
  description: string;
  date: string;
  startTime?: string;
  location: string;
  capacity?: number;
  /**
   * Optional pre-resolved coordinates. When omitted the hook geocodes
   * `location` for you. Provided when the host picked from an
   * autocomplete that already has lat/lng.
   */
  lat?: number;
  lng?: number;
}

interface MeetupDoc {
  title?: string;
  description?: string;
  date?: string;
  startTime?: string | null;
  location?: string;
  lat?: number | null;
  lng?: number | null;
  hostId?: string;
  hostName?: string;
  hostAvatar?: string | null;
  capacity?: number | null;
  createdAt?: Timestamp;
}

function tsToIso(ts: Timestamp | undefined): string {
  if (!ts) return "";
  try {
    return ts.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToMeetup(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): Meetup {
  const data = d.data() as MeetupDoc;
  return {
    id: d.id,
    title: data.title ?? "",
    description: data.description ?? "",
    date: data.date ?? "",
    startTime: data.startTime ?? undefined,
    location: data.location ?? "",
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    hostId: data.hostId ?? "",
    hostName: data.hostName ?? "Amiga",
    hostAvatar: data.hostAvatar ?? undefined,
    capacity: data.capacity ?? undefined,
    createdAt: tsToIso(data.createdAt),
  };
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export interface UseMeetupsResult {
  meetups: Meetup[];
  loading: boolean;
  isFirebase: boolean;
  /**
   * Create a meetup. Geocodes the location to lat/lng when coordinates
   * aren't supplied. Returns the new doc id, or null on failure.
   */
  createMeetup: (input: MeetupInput) => Promise<string | null>;
  updateMeetup: (id: string, patch: Partial<MeetupInput>) => Promise<boolean>;
  deleteMeetup: (id: string) => Promise<boolean>;
}

export function useMeetups(): UseMeetupsResult {
  return useSupabaseBackend ? useMeetupsSupabase() : useMeetupsFirebase();
}

function useMeetupsFirebase(): UseMeetupsResult {
  const user = useAuth((s) => s.user);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setMeetups([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "meetups"), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToMeetup)
          .filter((m) => m.date)
          .sort((a, b) => a.date.localeCompare(b.date));
        setMeetups(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[meetups] snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const createMeetup = useCallback(
    async (input: MeetupInput): Promise<string | null> => {
      if (!isFirebaseConfigured || !user) return null;
      const db = getDb();
      if (!db) return null;

      // Resolve coordinates: use supplied lat/lng, else geocode the
      // free-text location. A failed geocode still creates the meetup
      // (lat/lng null) so the listing never silently swallows it — it
      // just won't participate in distance sorting.
      let lat = input.lat ?? null;
      let lng = input.lng ?? null;
      if ((lat == null || lng == null) && input.location.trim()) {
        const geo = await geocodeLocation(input.location);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }

      // Security rules gate create on `hostId == request.auth.uid`, so the
      // doc MUST carry the real Firebase uid — not the Zustand user.id,
      // which is the literal "admin" for the bridged admin session.
      const hostId = getCurrentUid() ?? user.id;

      try {
        const ref = await addDoc(collection(db, "meetups"), {
          title: input.title.trim(),
          description: input.description.trim(),
          date: input.date,
          startTime: input.startTime?.trim() || null,
          location: input.location.trim(),
          lat,
          lng,
          hostId,
          hostName: user.name,
          hostAvatar: user.avatar ?? null,
          capacity: input.capacity ?? null,
          createdAt: serverTimestamp(),
        });
        return ref.id;
      } catch (err) {
        console.error("[meetups] create failed", err);
        return null;
      }
    },
    [user],
  );

  const updateMeetup = useCallback(
    async (id: string, patch: Partial<MeetupInput>): Promise<boolean> => {
      if (!isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        const cleaned: Record<string, unknown> = {};
        if (patch.title !== undefined) cleaned.title = patch.title.trim();
        if (patch.description !== undefined)
          cleaned.description = patch.description.trim();
        if (patch.date !== undefined) cleaned.date = patch.date;
        if (patch.startTime !== undefined)
          cleaned.startTime = patch.startTime?.trim() || null;
        if (patch.capacity !== undefined)
          cleaned.capacity = patch.capacity ?? null;
        // Re-geocode when the location changes.
        if (patch.location !== undefined) {
          cleaned.location = patch.location.trim();
          const geo = patch.location.trim()
            ? await geocodeLocation(patch.location)
            : null;
          cleaned.lat = geo?.lat ?? null;
          cleaned.lng = geo?.lng ?? null;
        }
        await updateDoc(doc(db, "meetups", id), cleaned);
        return true;
      } catch (err) {
        console.error("[meetups] update failed", err);
        return false;
      }
    },
    [],
  );

  const deleteMeetup = useCallback(async (id: string): Promise<boolean> => {
    if (!isFirebaseConfigured) return false;
    const db = getDb();
    if (!db) return false;
    try {
      await deleteDoc(doc(db, "meetups", id));
      return true;
    } catch (err) {
      console.error("[meetups] delete failed", err);
      return false;
    }
  }, []);

  return {
    meetups,
    loading,
    isFirebase: isFirebaseConfigured,
    createMeetup,
    updateMeetup,
    deleteMeetup,
  };
}
