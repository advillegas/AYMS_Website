"use client";

/**
 * Firestore-backed e-signature agreements with realtime subscription and
 * the dual-signature lifecycle (draft → sent → prospect_signed →
 * completed). Mirrors the architecture of use-trips.ts: a Firebase hook,
 * a Supabase mirror (use-agreements-supabase.ts), and a dual-run dispatch
 * keyed on useSupabaseBackend.
 *
 * Access model: an admin sees and authors every agreement; a member sees
 * only the agreements addressed to them. The hook supports both by taking
 * an optional `{ prospectId }` filter — the admin manager calls it with no
 * filter (reads all), the member signing surface passes the signed-in uid
 * so the Firestore query is constrained to docs that member is allowed to
 * read (see firestore.rules → match /agreements).
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
  where,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, getCurrentUid, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import { useAgreementsSupabase } from "./use-agreements-supabase";
import {
  canTransition,
  disclosuresSatisfied,
  type Agreement,
  type AgreementStatus,
  type DisclosureAck,
  type NewAgreement,
} from "./agreements-data";

export type { Agreement };

/* ------------------------------------------------------------------ */
/* Firestore schema                                                    */
/* ------------------------------------------------------------------ */

interface FirestoreAgreementDoc {
  reservationId?: string;
  tripId?: string;
  tripTitle?: string;
  prospectId?: string;
  prospectName?: string;
  prospectEmail?: string;
  templateId?: string;
  title?: string;
  bodyMarkdown?: string;
  disclosures?: DisclosureAck[];
  status?: AgreementStatus;
  adminSignerName?: string;
  adminSignatureText?: string;
  adminSignedAt?: Timestamp | string;
  prospectSignerName?: string;
  prospectSignatureText?: string;
  prospectSignedAt?: Timestamp | string;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function tsToIso(t: Timestamp | string | undefined | null): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  try {
    return t.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToAgreement(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): Agreement {
  const data = d.data() as FirestoreAgreementDoc;
  return {
    id: d.id,
    reservationId: data.reservationId,
    tripId: data.tripId,
    tripTitle: data.tripTitle ?? "",
    prospectId: data.prospectId ?? "",
    prospectName: data.prospectName ?? "",
    prospectEmail: data.prospectEmail,
    templateId: data.templateId ?? "",
    title: data.title ?? "",
    bodyMarkdown: data.bodyMarkdown ?? "",
    disclosures: Array.isArray(data.disclosures) ? data.disclosures : [],
    status: (data.status as AgreementStatus) ?? "draft",
    adminSignerName: data.adminSignerName,
    adminSignatureText: data.adminSignatureText,
    adminSignedAt: tsToIso(data.adminSignedAt) || undefined,
    prospectSignerName: data.prospectSignerName,
    prospectSignatureText: data.prospectSignatureText,
    prospectSignedAt: tsToIso(data.prospectSignedAt) || undefined,
    createdBy: data.createdBy,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

/** Newest first, by createdAt then title. */
export function sortAgreements(list: Agreement[]): Agreement[] {
  return [...list].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt);
    return a.title.localeCompare(b.title);
  });
}

/* ------------------------------------------------------------------ */
/* Signing payloads                                                    */
/* ------------------------------------------------------------------ */

export interface ProspectSignInput {
  signerName: string;
  signatureText: string;
  disclosures: DisclosureAck[];
}

export interface AdminSignInput {
  signerName: string;
  signatureText: string;
}

/* ------------------------------------------------------------------ */
/* Public hook                                                         */
/* ------------------------------------------------------------------ */

export interface UseAgreementsResult {
  agreements: Agreement[];
  loading: boolean;
  error: boolean;
  isFirestore: boolean;
  createAgreement: (a: NewAgreement) => Promise<string | null>;
  updateAgreement: (id: string, patch: Partial<Agreement>) => Promise<boolean>;
  sendAgreement: (id: string) => Promise<boolean>;
  signAsProspect: (id: string, input: ProspectSignInput) => Promise<boolean>;
  countersign: (id: string, input: AdminSignInput) => Promise<boolean>;
  voidAgreement: (id: string) => Promise<boolean>;
  deleteAgreement: (id: string) => Promise<boolean>;
}

export interface AgreementsFilter {
  /** Constrain to one prospect (members reading their own docs). */
  prospectId?: string;
}

export function useAgreements(filter?: AgreementsFilter): UseAgreementsResult {
  // useSupabaseBackend is a module-level constant, so this conditional
  // hook call is stable for the lifetime of the app (same pattern as
  // useTrips) — and it means only the ACTIVE backend ever subscribes,
  // instead of both opening live listeners.
  return useSupabaseBackend
    ? useAgreementsSupabase(filter)
    : useAgreementsFirebase(filter);
}

function useAgreementsFirebase(filter?: AgreementsFilter): UseAgreementsResult {
  const prospectId = filter?.prospectId;
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [error, setError] = useState(false);
  const isFirestore = isFirebaseConfigured;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAgreements([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setAgreements([]);
      setLoading(false);
      return;
    }
    const base = collection(db, "agreements");
    const q = prospectId
      ? query(base, where("prospectId", "==", prospectId), limit(500))
      : query(base, limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAgreements(sortAgreements(snap.docs.map(docToAgreement)));
        setError(false);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[agreements] snapshot failed", err);
        setError(true);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [prospectId]);

  const createAgreement = useCallback(
    async (a: NewAgreement): Promise<string | null> => {
      if (!isFirebaseConfigured) return null;
      const db = getDb();
      if (!db) return null;
      try {
        const ref = await addDoc(collection(db, "agreements"), {
          reservationId: a.reservationId ?? null,
          tripId: a.tripId ?? null,
          tripTitle: a.tripTitle ?? "",
          prospectId: a.prospectId,
          prospectName: a.prospectName ?? "",
          prospectEmail: a.prospectEmail ?? null,
          templateId: a.templateId ?? "",
          title: a.title ?? "",
          bodyMarkdown: a.bodyMarkdown ?? "",
          disclosures: a.disclosures ?? [],
          status: "draft" as AgreementStatus,
          createdBy: getCurrentUid() ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return ref.id;
      } catch (err) {
        console.error("[agreements] create failed", err);
        return null;
      }
    },
    [],
  );

  const updateAgreement = useCallback(
    async (id: string, patch: Partial<Agreement>): Promise<boolean> => {
      if (!isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        const { id: _id, createdAt: _ca, createdBy: _cb, ...rest } = patch;
        void _id;
        void _ca;
        void _cb;
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          cleaned[k] = v === undefined ? null : v;
        }
        cleaned.updatedAt = serverTimestamp();
        await updateDoc(doc(db, "agreements", id), cleaned);
        return true;
      } catch (err) {
        console.error("[agreements] update failed", err);
        return false;
      }
    },
    [],
  );

  // Every named transition re-checks the CURRENT status before writing,
  // so a stale UI (or a direct hook call) can't sign a draft, countersign
  // a voided document, double-countersign, or delete a completed
  // contract. firestore.rules + the Postgres trigger enforce the same
  // machine server-side; this layer just fails fast with a clean toast.
  const sendAgreement = useCallback(
    async (id: string): Promise<boolean> => {
      const cur = agreements.find((a) => a.id === id);
      if (!cur || !canTransition(cur.status, "sent")) {
        console.warn("[agreements] illegal send from", cur?.status);
        return false;
      }
      return updateAgreement(id, { status: "sent" });
    },
    [agreements, updateAgreement],
  );

  const signAsProspect = useCallback(
    async (id: string, input: ProspectSignInput): Promise<boolean> => {
      const cur = agreements.find((a) => a.id === id);
      if (!cur || !canTransition(cur.status, "prospect_signed")) {
        console.warn("[agreements] illegal sign from", cur?.status);
        return false;
      }
      if (!disclosuresSatisfied(cur.disclosures, input.disclosures)) {
        console.warn("[agreements] disclosures incomplete");
        return false;
      }
      return updateAgreement(id, {
        status: "prospect_signed",
        prospectSignerName: input.signerName,
        prospectSignatureText: input.signatureText,
        prospectSignedAt: new Date().toISOString(),
        disclosures: input.disclosures,
      });
    },
    [agreements, updateAgreement],
  );

  const countersign = useCallback(
    async (id: string, input: AdminSignInput): Promise<boolean> => {
      const cur = agreements.find((a) => a.id === id);
      if (!cur || !canTransition(cur.status, "completed")) {
        console.warn("[agreements] illegal countersign from", cur?.status);
        return false;
      }
      return updateAgreement(id, {
        status: "completed",
        adminSignerName: input.signerName,
        adminSignatureText: input.signatureText,
        adminSignedAt: new Date().toISOString(),
      });
    },
    [agreements, updateAgreement],
  );

  const voidAgreement = useCallback(
    async (id: string): Promise<boolean> => {
      const cur = agreements.find((a) => a.id === id);
      if (!cur || !canTransition(cur.status, "void")) {
        console.warn("[agreements] illegal void from", cur?.status);
        return false;
      }
      return updateAgreement(id, { status: "void" });
    },
    [agreements, updateAgreement],
  );

  const deleteAgreement = useCallback(
    async (id: string): Promise<boolean> => {
      const cur = agreements.find((a) => a.id === id);
      if (cur?.status === "completed") {
        console.warn("[agreements] completed agreements cannot be deleted");
        return false;
      }
      if (!isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        await deleteDoc(doc(db, "agreements", id));
        return true;
      } catch (err) {
        console.error("[agreements] delete failed", err);
        return false;
      }
    },
    [agreements],
  );

  return {
    agreements,
    loading,
    error,
    isFirestore,
    createAgreement,
    updateAgreement,
    sendAgreement,
    signAsProspect,
    countersign,
    voidAgreement,
    deleteAgreement,
  };
}
