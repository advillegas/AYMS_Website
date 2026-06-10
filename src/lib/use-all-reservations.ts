"use client";

/**
 * Live listener over ALL trip reservations (admin roster view). Powers
 * both the agreements recipient picker and the Leads page. Firestore
 * rules let admins read the whole collection; no orderBy (avoids a
 * composite index), sorted newest-first client-side. `error` surfaces a
 * denied/offline listener so an empty roster isn't misread as "no leads".
 * Cancelled rows are kept; callers filter them out as needed.
 */

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  query,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import { useAllReservationsSupabase } from "./use-trip-reservations-supabase";
import {
  type ReservationStatus,
  type TripReservation,
} from "./use-trip-reservations";

interface ReservationDoc {
  tripId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string | null;
  status?: ReservationStatus;
  note?: string | null;
  createdAt?: { toDate?: () => Date };
}

function docToReservation(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): TripReservation {
  const data = d.data() as ReservationDoc;
  let createdAt = "";
  try {
    createdAt = data.createdAt?.toDate?.()?.toISOString() ?? "";
  } catch {
    createdAt = "";
  }
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
    createdAt,
  };
}

export function useAllReservations(): {
  reservations: TripReservation[];
  loading: boolean;
  error: boolean;
} {
  return useSupabaseBackend
    ? useAllReservationsSupabase()
    : useAllReservationsFirebase();
}

function useAllReservationsFirebase(): {
  reservations: TripReservation[];
  loading: boolean;
  error: boolean;
} {
  const [reservations, setReservations] = useState<TripReservation[]>([]);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "tripReservations"), limit(1000));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReservations(
          snap.docs
            .map(docToReservation)
            .sort((a, b) =>
              (b.createdAt || "").localeCompare(a.createdAt || ""),
            ),
        );
        setError(false);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[reservations] snapshot failed", err);
        setError(true);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { reservations, loading, error };
}
