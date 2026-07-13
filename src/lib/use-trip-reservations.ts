"use client";

/**
 * Trip reservations backed by a flat Firestore collection
 * `tripReservations/{autoId}` → { tripId, userId, userName, userAvatar,
 * status: "reserved" | "waitlist" | "cancelled", note?, createdAt }.
 *
 * Unlike RSVPs (one doc per uid in a subcollection), reservations live
 * in a flat collection so a future admin roster view can read every
 * reservation across all trips with a single listener. We still enforce
 * "one active reservation per member per trip" in app logic by reusing
 * the member's existing doc id when they re-reserve.
 *
 * Live seat math:
 *   spotsLeft = trip.spots − count(status === "reserved")
 *   when spotsLeft <= 0 a new reservation lands on the waitlist.
 *
 * When Firestore isn't configured every mutation is a graceful no-op
 * and the list stays empty (mirrors use-events.ts).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import {
  useMyTripReservationsSupabase,
  useTripReservationsSupabase,
} from "./use-trip-reservations-supabase";
import { useAuth } from "./store";
import { pushNotification } from "./notify";
import { getTripById } from "./trips-data";
import { trackEvent } from "./activity-tracker";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ReservationStatus = "reserved" | "waitlist" | "cancelled";

export interface TripReservation {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: ReservationStatus;
  note?: string;
  /** ISO timestamp; "" until the serverTimestamp resolves. */
  createdAt: string;
}

interface ReservationDoc {
  tripId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string | null;
  status?: ReservationStatus;
  note?: string | null;
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

function docToReservation(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): TripReservation {
  const data = d.data() as ReservationDoc;
  return {
    id: d.id,
    tripId: data.tripId ?? "",
    userId: data.userId ?? "",
    userName: data.userName ?? "Amiga",
    userAvatar: data.userAvatar ?? undefined,
    status:
      data.status === "waitlist"
        ? "waitlist"
        : data.status === "cancelled"
          ? "cancelled"
          : "reserved",
    note: data.note ?? undefined,
    createdAt: tsToIso(data.createdAt),
  };
}

/* ------------------------------------------------------------------ */
/* Per-trip hook (reserve button + trip detail)                        */
/* ------------------------------------------------------------------ */

export interface UseTripReservationsResult {
  reservations: TripReservation[];
  reserved: TripReservation[];
  waitlist: TripReservation[];
  reservedCount: number;
  waitlistCount: number;
  /** trip.spots − reservedCount, clamped at 0. */
  spotsLeft: number;
  /** True when no seats remain (new reservations go to the waitlist). */
  isFull: boolean;
  /** The current user's active (non-cancelled) reservation, or null. */
  myReservation: TripReservation | null;
  loading: boolean;
  isFirebase: boolean;
  /**
   * Reserve a seat (or join the waitlist if full). Idempotent: if the
   * member already holds an active reservation it's returned as-is.
   * Emits a `reservation` notification to the member on success.
   * Returns the resulting status, or null on failure.
   */
  reserve: (note?: string) => Promise<ReservationStatus | null>;
  /** Cancel the current user's reservation (soft — status → cancelled). */
  cancel: () => Promise<boolean>;
}

export function useTripReservations(
  tripId: string | null | undefined,
  totalSpots: number,
): UseTripReservationsResult {
  // House dual-backend dispatch: useSupabaseBackend is a build-time
  // constant, so hook order is stable for the life of the app.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSupabaseBackend ? useTripReservationsSupabase(tripId, totalSpots) : useTripReservationsFirebase(tripId, totalSpots);
}

function useTripReservationsFirebase(
  tripId: string | null | undefined,
  totalSpots: number,
): UseTripReservationsResult {
  const user = useAuth((s) => s.user);
  const [reservations, setReservations] = useState<TripReservation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tripId || !isFirebaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- house guard pattern (pre-existing)
      setReservations([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // Filter by tripId server-side (single-field equality needs no
    // composite index); sort + status-split happen client-side.
    const q = query(
      collection(db, "tripReservations"),
      where("tripId", "==", tripId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToReservation)
          .sort((a, b) => (a.createdAt || "￿").localeCompare(b.createdAt || "￿"));
        setReservations(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[trip-reservations] snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [tripId]);

  const reserved = useMemo(
    () => reservations.filter((r) => r.status === "reserved"),
    [reservations],
  );
  const waitlist = useMemo(
    () => reservations.filter((r) => r.status === "waitlist"),
    [reservations],
  );

  const spotsLeft = Math.max(0, totalSpots - reserved.length);
  const isFull = spotsLeft <= 0;

  const myReservation = useMemo(() => {
    if (!user) return null;
    return (
      reservations.find(
        (r) => r.userId === user.id && r.status !== "cancelled",
      ) ?? null
    );
  }, [reservations, user]);

  const reserve = useCallback(
    async (note?: string): Promise<ReservationStatus | null> => {
      if (!tripId || !user || !isFirebaseConfigured) return null;
      const db = getDb();
      if (!db) return null;

      // Already holding an active reservation? Return it untouched so
      // the toggle is idempotent.
      if (myReservation) return myReservation.status;

      // Re-activate a previously cancelled reservation rather than
      // stacking a duplicate doc.
      const prior = reservations.find(
        (r) => r.userId === user.id && r.status === "cancelled",
      );
      const status: ReservationStatus = isFull ? "waitlist" : "reserved";

      try {
        if (prior) {
          await updateDoc(doc(db, "tripReservations", prior.id), {
            status,
            note: note?.trim() || null,
            createdAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, "tripReservations"), {
            tripId,
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar ?? null,
            status,
            note: note?.trim() || null,
            createdAt: serverTimestamp(),
          });
        }

        // Confirm to the member.
        const trip = getTripById(tripId);
        const tripName = trip?.title ?? "your trip";
        void pushNotification(user.id, {
          kind: "reservation",
          title:
            status === "reserved"
              ? `You're booked for ${tripName} 🎉`
              : `You're on the waitlist for ${tripName}`,
          body:
            status === "reserved"
              ? "Your spot is saved. We'll be in touch with next steps."
              : "We'll let you know the moment a seat opens up.",
          href: "/community/my-events",
        });
        trackEvent(
          status === "waitlist" ? "waitlist_join" : "trip_reservation",
          { tripId },
        );
        return status;
      } catch (err) {
        console.error("[trip-reservations] reserve failed", err);
        return null;
      }
    },
    [tripId, user, myReservation, reservations, isFull],
  );

  const cancel = useCallback(async (): Promise<boolean> => {
    if (!user || !isFirebaseConfigured || !myReservation) return false;
    const db = getDb();
    if (!db) return false;
    try {
      await updateDoc(doc(db, "tripReservations", myReservation.id), {
        status: "cancelled",
      });
      return true;
    } catch (err) {
      console.error("[trip-reservations] cancel failed", err);
      return false;
    }
  }, [user, myReservation]);

  return {
    reservations,
    reserved,
    waitlist,
    reservedCount: reserved.length,
    waitlistCount: waitlist.length,
    spotsLeft,
    isFull,
    myReservation,
    loading,
    isFirebase: isFirebaseConfigured,
    reserve,
    cancel,
  };
}

/* ------------------------------------------------------------------ */
/* Per-member hook (My Upcoming)                                       */
/* ------------------------------------------------------------------ */

/**
 * Live list of the current user's active reservations across every
 * trip. Powers the "My Upcoming" page. Filtered by userId server-side;
 * cancelled rows are dropped client-side.
 */
export function useMyTripReservations(): {
  reservations: TripReservation[];
  loading: boolean;
} {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- build-time constant switch (house pattern)
  return useSupabaseBackend ? useMyTripReservationsSupabase() : useMyTripReservationsFirebase();
}

function useMyTripReservationsFirebase(): {
  reservations: TripReservation[];
  loading: boolean;
} {
  const uid = useAuth((s) => s.user?.id);
  const [reservations, setReservations] = useState<TripReservation[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!uid || !isFirebaseConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- house guard pattern (pre-existing)
      setReservations([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "tripReservations"),
      where("userId", "==", uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToReservation)
          .filter((r) => r.status !== "cancelled")
          .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
        setReservations(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[trip-reservations] my-snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  return { reservations, loading };
}
