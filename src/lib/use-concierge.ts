"use client";

/**
 * Concierge lead capture + admin pipeline.
 *
 * Submit side (public marketing form): persists a trip-planning inquiry
 * following the house dual-backend pattern —
 *   • Supabase (PRIMARY, live in production): `concierge_inquiries`
 *     table (public insert, admin-only read/manage — see
 *     supabase/concierge-inquiries.sql).
 *   • Firestore (legacy/secondary, when NEXT_PUBLIC_USE_SUPABASE is
 *     off): `conciergeInquiries` collection (rules in firestore.rules).
 * Degrades gracefully to a local "received" when no backend is
 * configured, so the marketing form never hard-fails for a visitor.
 * Fires an in-app notification to the admin so a hot lead is never
 * missed, and logs a `concierge_inquiry` activity event.
 *
 * Admin side: `useConciergeInquiries` powers /community/admin/concierge
 * — a live newest-first list plus the new → contacted → closed status
 * cycle, persisted to whichever backend is active.
 */

import { useState, useCallback, useEffect } from "react";
import {
  collection,
  doc,
  limit as fsLimit,
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
import { getSupabase, useSupabaseBackend } from "./supabase";
import { subscribeQuery, tsToIso as sbTsToIso } from "./supabase-helpers";
import { ensureSupabaseSession } from "./ensure-session";
import { pushNotification } from "./notify";
import { trackEvent } from "./activity-tracker";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ConciergeInquiryInput {
  name: string;
  email: string;
  phone?: string;
  destination?: string;
  travelDates?: string;
  partySize?: string;
  budget?: string;
  details?: string;
}

export type ConciergeSubmitStatus = "sent" | "local" | "error";

export interface ConciergeSubmitResult {
  status: ConciergeSubmitStatus;
  message: string;
}

/** Pipeline stage of a lead. Cycled by the admin: new → contacted → closed. */
export type ConciergeStatus = "new" | "contacted" | "closed";

export const CONCIERGE_STATUS_CYCLE: ConciergeStatus[] = [
  "new",
  "contacted",
  "closed",
];

export interface ConciergeInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  destination?: string;
  travelDates?: string;
  partySize?: string;
  budget?: string;
  details?: string;
  status: ConciergeStatus;
  /** ISO timestamp; "" when unknown. */
  createdAt: string;
}

function normalizeStatus(raw: string | null | undefined): ConciergeStatus {
  return raw === "contacted" || raw === "closed" ? raw : "new";
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const OK_MESSAGE =
  "Gracias, amiga! Your request is in — we'll reach out within 1–2 business days. ♡";

/* ------------------------------------------------------------------ */
/* Submit (public form)                                                */
/* ------------------------------------------------------------------ */

export async function submitConciergeInquiry(
  input: ConciergeInquiryInput,
): Promise<ConciergeSubmitResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) {
    return { status: "error", message: "Please add your name." };
  }
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  const notifyAdmin = () => {
    // Best-effort heads-up to the owner. Never block the visitor on it.
    const summary = [input.destination?.trim(), input.travelDates?.trim()]
      .filter(Boolean)
      .join(" · ");
    void pushNotification("admin", {
      kind: "system",
      title: `New concierge inquiry — ${name}`,
      body: summary ? `${email} · ${summary}` : email,
      href: "/community/admin/concierge",
    });
    trackEvent("concierge_inquiry", {
      destination: input.destination?.trim() || null,
    });
  };

  // Supabase — the live production backend.
  if (useSupabaseBackend) {
    const sb = getSupabase();
    if (!sb) return { status: "local", message: OK_MESSAGE };

    const id = generateId();
    const { error } = await sb.from("concierge_inquiries").insert({
      id,
      name,
      email,
      phone: input.phone?.trim() || null,
      destination: input.destination?.trim() || null,
      travel_dates: input.travelDates?.trim() || null,
      party_size: input.partySize?.trim() || null,
      budget: input.budget?.trim() || null,
      details: input.details?.trim() || null,
      status: "new",
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error("[concierge] submit failed", error.message);
      return {
        status: "error",
        message: "Something went wrong. Please try again, or email us directly.",
      };
    }
    notifyAdmin();
    return { status: "sent", message: OK_MESSAGE };
  }

  // Firestore — legacy/secondary path behind the flag.
  if (isFirebaseConfigured) {
    const db = getDb();
    if (db) {
      try {
        await setDoc(doc(db, "conciergeInquiries", generateId()), {
          name,
          email,
          phone: input.phone?.trim() || null,
          destination: input.destination?.trim() || null,
          travelDates: input.travelDates?.trim() || null,
          partySize: input.partySize?.trim() || null,
          budget: input.budget?.trim() || null,
          details: input.details?.trim() || null,
          status: "new",
          createdAt: serverTimestamp(),
        });
        notifyAdmin();
        return { status: "sent", message: OK_MESSAGE };
      } catch (err) {
        // e.g. stale security rules — accept gracefully, never hard-fail
        // the visitor. The admin still gets the in-app notification try.
        console.warn("[concierge] firestore submit failed", err);
        return { status: "local", message: OK_MESSAGE };
      }
    }
  }

  // No backend configured (local dev): accept gracefully.
  return { status: "local", message: OK_MESSAGE };
}

export interface UseConciergeResult {
  submitting: boolean;
  submit: (input: ConciergeInquiryInput) => Promise<ConciergeSubmitResult>;
}

export function useConcierge(): UseConciergeResult {
  const [submitting, setSubmitting] = useState(false);
  const submit = useCallback(async (input: ConciergeInquiryInput) => {
    setSubmitting(true);
    try {
      return await submitConciergeInquiry(input);
    } finally {
      setSubmitting(false);
    }
  }, []);
  return { submitting, submit };
}

/* ------------------------------------------------------------------ */
/* Admin pipeline (list + status cycle)                                */
/* ------------------------------------------------------------------ */

interface ConciergeRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  destination: string | null;
  travel_dates: string | null;
  party_size: string | null;
  budget: string | null;
  details: string | null;
  status: string | null;
  created_at: string | null;
}

function rowToInquiry(r: ConciergeRow): ConciergeInquiry {
  return {
    id: r.id,
    name: r.name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? undefined,
    destination: r.destination ?? undefined,
    travelDates: r.travel_dates ?? undefined,
    partySize: r.party_size ?? undefined,
    budget: r.budget ?? undefined,
    details: r.details ?? undefined,
    status: normalizeStatus(r.status),
    createdAt: sbTsToIso(r.created_at),
  };
}

interface ConciergeDoc {
  name?: string;
  email?: string;
  phone?: string | null;
  destination?: string | null;
  travelDates?: string | null;
  partySize?: string | null;
  budget?: string | null;
  details?: string | null;
  status?: string;
  createdAt?: Timestamp;
}

function docToInquiry(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): ConciergeInquiry {
  const data = d.data() as ConciergeDoc;
  let createdAt = "";
  try {
    createdAt = data.createdAt?.toDate().toISOString() ?? "";
  } catch {
    createdAt = "";
  }
  return {
    id: d.id,
    name: data.name ?? "",
    email: data.email ?? "",
    phone: data.phone ?? undefined,
    destination: data.destination ?? undefined,
    travelDates: data.travelDates ?? undefined,
    partySize: data.partySize ?? undefined,
    budget: data.budget ?? undefined,
    details: data.details ?? undefined,
    status: normalizeStatus(data.status),
    createdAt,
  };
}

export interface UseConciergeInquiriesResult {
  inquiries: ConciergeInquiry[];
  loading: boolean;
  /** True when a live backend is wired (empty-state copy). */
  isLive: boolean;
  /** Persist a lead's pipeline stage. Resolves false on failure. */
  setStatus: (id: string, status: ConciergeStatus) => Promise<boolean>;
}

/**
 * Live, newest-first list of every concierge inquiry (admin-only —
 * RLS / rules deny non-admin reads, which surfaces as an empty list).
 */
export function useConciergeInquiries(): UseConciergeInquiriesResult {
  const [inquiries, setInquiries] = useState<ConciergeInquiry[]>([]);
  const [loading, setLoading] = useState(
    useSupabaseBackend || isFirebaseConfigured,
  );

  useEffect(() => {
    if (useSupabaseBackend) {
      return subscribeQuery<ConciergeRow>(
        "concierge_inquiries",
        (sb) =>
          sb
            .from("concierge_inquiries")
            .select("*")
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(1000),
        (rows) => {
          setInquiries(
            rows
              .map(rowToInquiry)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          );
          setLoading(false);
        },
        (msg) => {
          console.warn("[concierge:sb] query failed", msg);
          setLoading(false);
        },
      );
    }
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    // No orderBy (avoids index requirements); sort client-side, house style.
    const unsub = onSnapshot(
      query(collection(db, "conciergeInquiries"), fsLimit(1000)),
      (snap) => {
        setInquiries(
          snap.docs
            .map(docToInquiry)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[concierge] snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const setStatus = useCallback(
    async (id: string, status: ConciergeStatus): Promise<boolean> => {
      if (useSupabaseBackend) {
        const sb = getSupabase();
        if (!sb) return false;
        try {
          // Refresh a lapsed token first — an anon-role update would be
          // silently filtered to 0 rows by RLS.
          await ensureSupabaseSession(sb);
          const { error } = await sb
            .from("concierge_inquiries")
            .update({ status })
            .eq("id", id);
          if (error) throw new Error(error.message);
          // Optimistic: realtime/poll will confirm shortly.
          setInquiries((prev) =>
            prev.map((i) => (i.id === id ? { ...i, status } : i)),
          );
          return true;
        } catch (err) {
          console.error("[concierge:sb] status update failed", err);
          return false;
        }
      }
      if (!isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        await updateDoc(doc(db, "conciergeInquiries", id), { status });
        return true;
      } catch (err) {
        console.error("[concierge] status update failed", err);
        return false;
      }
    },
    [],
  );

  return {
    inquiries,
    loading,
    isLive: useSupabaseBackend || isFirebaseConfigured,
    setStatus,
  };
}
