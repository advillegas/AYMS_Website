"use client";

/**
 * Admin dialogs for the in-house e-signature flow:
 *
 *   • AgreementFormDialog  — pick a template + a recipient (a member who
 *     reserved a trip), preview the merged document, and create a DRAFT.
 *   • CountersignDialog    — the admin reviews a prospect-signed document,
 *     types their name as a signature, and counter-signs it to COMPLETED.
 *
 * Both mirror the structure/styling of admin/trip-form.tsx (controlled
 * Dialog, fields re-seeded on open, brand-primary submit button). The
 * page owns persistence via use-agreements.ts; these are pure UI shells
 * that hand a built payload back through `onCreate` / `onCountersign`.
 */

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  limit,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  AGREEMENT_TEMPLATES,
  getTemplate,
  renderTemplate,
  templateDisclosures,
  type MergeVars,
  type NewAgreement,
} from "@/lib/agreements-data";
import type { Trip } from "@/lib/use-trips";
import {
  type ReservationStatus,
  type TripReservation,
} from "@/lib/use-trip-reservations";

const COMPANY_NAME = "Amigas y Más Social";

/* ------------------------------------------------------------------ */
/* Admin-wide reservations listener (recipient picker source)          */
/* ------------------------------------------------------------------ */

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

/**
 * Live listener over ALL trip reservations (admin roster view). Powers
 * both the agreements recipient picker and the Leads page. Firestore
 * rules let admins read the whole collection; no orderBy (avoids a
 * composite index), sorted newest-first client-side. `error` surfaces a
 * denied/offline listener so an empty roster isn't misread as "no leads".
 * Cancelled rows are kept; callers filter them out as needed.
 */
export function useAllReservations(): {
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

/** Match the trip-form's multi-line field styling. */
const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** "$1,234" (no cents) — falls back to "$0" for a missing/NaN amount. */
function formatMoney(n: number | undefined): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `$${Math.round(v).toLocaleString()}`;
}

/** Build the MergeVars for a recipient's trip (visible-gap on missing). */
function buildVars(prospectName: string, trip: Trip | undefined): MergeVars {
  return {
    companyName: COMPANY_NAME,
    prospectName,
    tripTitle: trip?.title ?? "",
    destination: trip?.destination ?? "",
    dates: trip?.dates ?? "",
    price: trip ? formatMoney(trip.price) : "",
    deposit: trip ? formatMoney(trip.deposit) : "",
    today: new Date().toLocaleDateString(),
  };
}

/* ------------------------------------------------------------------ */
/* New agreement dialog                                                */
/* ------------------------------------------------------------------ */

export function AgreementFormDialog({
  open,
  onOpenChange,
  reservations,
  trips,
  initialReservationId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Active (non-cancelled) reservations to choose a recipient from. */
  reservations: TripReservation[];
  trips: Trip[];
  /** Preselect this reservation when the dialog opens (deep-link). */
  initialReservationId?: string;
  onCreate: (payload: NewAgreement) => Promise<boolean>;
}) {
  const [templateId, setTemplateId] = useState(AGREEMENT_TEMPLATES[0]?.id ?? "");
  const [reservationId, setReservationId] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [busy, setBusy] = useState(false);

  // (Re)seed the controlled fields whenever the dialog opens or the
  // deep-linked reservation changes, so a fresh open never shows stale
  // selections and the funnel deep-link lands preselected.
  useEffect(() => {
    if (!open) return;
    setTemplateId(AGREEMENT_TEMPLATES[0]?.id ?? "");
    setReservationId(initialReservationId ?? "");
    setProspectEmail("");
    setBusy(false);
  }, [open, initialReservationId]);

  const tripById = useMemo(() => {
    const map = new Map<string, Trip>();
    for (const t of trips) map.set(t.id, t);
    return map;
  }, [trips]);

  const template = getTemplate(templateId);
  const reservation = reservations.find((r) => r.id === reservationId);
  const trip = reservation ? tripById.get(reservation.tripId) : undefined;

  const vars = useMemo(
    () => buildVars(reservation?.userName ?? "", trip),
    [reservation?.userName, trip],
  );

  const previewTitle = template
    ? renderTemplate(template.titleTemplate, vars)
    : "";
  const previewBody = template ? renderTemplate(template.body, vars) : "";

  async function handleCreate() {
    if (!template) {
      toast.error("Pick a document template.");
      return;
    }
    if (!reservation) {
      toast.error("Pick who this agreement is for.");
      return;
    }
    setBusy(true);
    try {
      const payload: NewAgreement = {
        reservationId: reservation.id,
        tripId: reservation.tripId || undefined,
        tripTitle: trip?.title ?? "",
        prospectId: reservation.userId,
        prospectName: reservation.userName,
        prospectEmail: prospectEmail.trim() || undefined,
        templateId: template.id,
        title: renderTemplate(template.titleTemplate, vars),
        bodyMarkdown: renderTemplate(template.body, vars),
        disclosures: templateDisclosures(template),
      };
      const ok = await onCreate(payload);
      if (ok) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            New agreement
          </DialogTitle>
          <DialogDescription>
            Create a legal document for a member who reserved a trip. It
            starts as a draft — send it when you&apos;re ready for them to
            sign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label>Template</Label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={selectClass}
            >
              {AGREEMENT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {template ? (
              <p className="text-[11px] text-muted-foreground">
                {template.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label>Recipient</Label>
            {reservations.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No trip reservations yet — a member must reserve a trip
                before you can address an agreement to them.
              </p>
            ) : (
              <select
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                className={selectClass}
              >
                <option value="">Select a member…</option>
                {reservations.map((r) => {
                  const t = tripById.get(r.tripId);
                  const tripName = t?.title ?? r.tripId ?? "Trip";
                  return (
                    <option key={r.id} value={r.id}>
                      {r.userName} — {tripName} ({r.status})
                    </option>
                  );
                })}
              </select>
            )}
            <p className="text-[11px] text-muted-foreground">
              The list comes from live trip reservations across all members.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label>Prospect email (optional)</Label>
            <Input
              type="email"
              value={prospectEmail}
              onChange={(e) => setProspectEmail(e.target.value)}
              placeholder="reservations don't capture email — add one if you have it"
            />
          </div>

          {/* Live preview of the merged document the prospect will sign. */}
          <div className="grid gap-1.5">
            <Label>Preview</Label>
            <div className="rounded-lg border border-rosa/20 bg-muted/30 p-3 max-h-64 overflow-y-auto">
              {template ? (
                <>
                  <p className="text-sm font-semibold mb-2">{previewTitle}</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-line">
                    {previewBody}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Pick a template to preview the document.
                </p>
              )}
            </div>
            {!reservation && template ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Choose a recipient to fill the trip, price, and dates.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={busy || !template || !reservation}
            className="bg-primary hover:bg-magenta"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Countersign dialog                                                  */
/* ------------------------------------------------------------------ */

export function CountersignDialog({
  open,
  onOpenChange,
  prospectName,
  agreementTitle,
  defaultSignerName,
  onCountersign,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospectName: string;
  agreementTitle: string;
  /** Seed the signature with the signed-in admin's name when available. */
  defaultSignerName?: string;
  onCountersign: (signerName: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(defaultSignerName ?? "");
    setBusy(false);
  }, [open, defaultSignerName]);

  async function handleCountersign() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Type your full name to sign.");
      return;
    }
    setBusy(true);
    try {
      const ok = await onCountersign(trimmed);
      if (ok) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            Countersign agreement
          </DialogTitle>
          <DialogDescription>
            {prospectName} has signed &ldquo;{agreementTitle}&rdquo;. Counter-sign
            to complete it — this confirms {prospectName} as a client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label>Your full name (signature)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria Gonzalez"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Typing your name here is your legal signature on this document.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCountersign}
            disabled={busy || !name.trim()}
            className="bg-primary hover:bg-magenta"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Countersign &amp; complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
