"use client";

/**
 * Supabase implementation of useAgreements. Delegated to from
 * use-agreements.ts when useSupabaseBackend is on. Same return shape as
 * the Firestore version so consumers are untouched.
 */

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery, tsToIso } from "./supabase-helpers";
import { getCurrentUid } from "./firebase";
import type {
  Agreement,
  AgreementStatus,
  DisclosureAck,
  NewAgreement,
} from "./agreements-data";
import {
  sortAgreements,
  type AdminSignInput,
  type AgreementsFilter,
  type ProspectSignInput,
  type UseAgreementsResult,
} from "./use-agreements";

interface AgreementRow {
  id: string;
  reservation_id: string | null;
  trip_id: string | null;
  trip_title: string | null;
  prospect_id: string | null;
  prospect_name: string | null;
  prospect_email: string | null;
  template_id: string | null;
  title: string | null;
  body_markdown: string | null;
  disclosures: DisclosureAck[] | null;
  status: string | null;
  admin_signer_name: string | null;
  admin_signature_text: string | null;
  admin_signed_at: string | null;
  prospect_signer_name: string | null;
  prospect_signature_text: string | null;
  prospect_signed_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function rowToAgreement(r: AgreementRow): Agreement {
  return {
    id: r.id,
    reservationId: r.reservation_id ?? undefined,
    tripId: r.trip_id ?? undefined,
    tripTitle: r.trip_title ?? "",
    prospectId: r.prospect_id ?? "",
    prospectName: r.prospect_name ?? "",
    prospectEmail: r.prospect_email ?? undefined,
    templateId: r.template_id ?? "",
    title: r.title ?? "",
    bodyMarkdown: r.body_markdown ?? "",
    disclosures: Array.isArray(r.disclosures) ? r.disclosures : [],
    status: (r.status as AgreementStatus) ?? "draft",
    adminSignerName: r.admin_signer_name ?? undefined,
    adminSignatureText: r.admin_signature_text ?? undefined,
    adminSignedAt: tsToIso(r.admin_signed_at) || undefined,
    prospectSignerName: r.prospect_signer_name ?? undefined,
    prospectSignatureText: r.prospect_signature_text ?? undefined,
    prospectSignedAt: tsToIso(r.prospect_signed_at) || undefined,
    createdBy: r.created_by ?? undefined,
    createdAt: tsToIso(r.created_at),
    updatedAt: tsToIso(r.updated_at),
  };
}

/** camelCase Agreement field → snake_case agreements column. */
const COL: Record<string, string> = {
  reservationId: "reservation_id",
  tripId: "trip_id",
  tripTitle: "trip_title",
  prospectId: "prospect_id",
  prospectName: "prospect_name",
  prospectEmail: "prospect_email",
  templateId: "template_id",
  title: "title",
  bodyMarkdown: "body_markdown",
  disclosures: "disclosures",
  status: "status",
  adminSignerName: "admin_signer_name",
  adminSignatureText: "admin_signature_text",
  adminSignedAt: "admin_signed_at",
  prospectSignerName: "prospect_signer_name",
  prospectSignatureText: "prospect_signature_text",
  prospectSignedAt: "prospect_signed_at",
};

function agreementToRow(patch: Partial<Agreement>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = COL[k];
    if (col) row[col] = v === undefined ? null : v;
  }
  return row;
}

export function useAgreementsSupabase(
  filter?: AgreementsFilter,
): UseAgreementsResult {
  const prospectId = filter?.prospectId;
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsub = subscribeQuery<AgreementRow>(
      "agreements",
      (sb) => {
        let q = sb.from("agreements").select("*");
        if (prospectId) q = q.eq("prospect_id", prospectId);
        return q.limit(500);
      },
      (rows) => {
        setAgreements(sortAgreements(rows.map(rowToAgreement)));
        setError(false);
        setLoading(false);
      },
      (msg) => {
        console.warn("[agreements:sb] query failed", msg);
        setError(true);
        setLoading(false);
      },
      prospectId ? { column: "prospect_id", value: prospectId } : undefined,
    );
    return unsub;
  }, [prospectId]);

  const createAgreement = useCallback(
    async (a: NewAgreement): Promise<string | null> => {
      const sb = getSupabase();
      if (!sb) return null;
      const id = `agr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error: insErr } = await sb.from("agreements").insert({
        id,
        ...agreementToRow(a as Partial<Agreement>),
        status: "draft",
        created_by: getCurrentUid() ?? null,
      });
      if (insErr) {
        console.error("[agreements:sb] create failed", insErr.message);
        return null;
      }
      return id;
    },
    [],
  );

  const updateAgreement = useCallback(
    async (id: string, patch: Partial<Agreement>): Promise<boolean> => {
      const sb = getSupabase();
      if (!sb) return false;
      const { id: _id, createdAt: _ca, createdBy: _cb, ...rest } = patch;
      void _id;
      void _ca;
      void _cb;
      const row = agreementToRow(rest);
      row.updated_at = new Date().toISOString();
      const { error: upErr } = await sb
        .from("agreements")
        .update(row)
        .eq("id", id);
      if (upErr) {
        console.error("[agreements:sb] update failed", upErr.message);
        return false;
      }
      return true;
    },
    [],
  );

  const sendAgreement = useCallback(
    (id: string) => updateAgreement(id, { status: "sent" }),
    [updateAgreement],
  );

  const signAsProspect = useCallback(
    (id: string, input: ProspectSignInput) =>
      updateAgreement(id, {
        status: "prospect_signed",
        prospectSignerName: input.signerName,
        prospectSignatureText: input.signatureText,
        prospectSignedAt: new Date().toISOString(),
        disclosures: input.disclosures,
      }),
    [updateAgreement],
  );

  const countersign = useCallback(
    (id: string, input: AdminSignInput) =>
      updateAgreement(id, {
        status: "completed",
        adminSignerName: input.signerName,
        adminSignatureText: input.signatureText,
        adminSignedAt: new Date().toISOString(),
      }),
    [updateAgreement],
  );

  const voidAgreement = useCallback(
    (id: string) => updateAgreement(id, { status: "void" }),
    [updateAgreement],
  );

  const deleteAgreement = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const { error: delErr } = await sb.from("agreements").delete().eq("id", id);
    if (delErr) {
      console.error("[agreements:sb] delete failed", delErr.message);
      return false;
    }
    return true;
  }, []);

  return {
    agreements,
    loading,
    error,
    isFirestore: true,
    createAgreement,
    updateAgreement,
    sendAgreement,
    signAsProspect,
    countersign,
    voidAgreement,
    deleteAgreement,
  };
}
