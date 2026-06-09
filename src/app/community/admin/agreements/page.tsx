"use client";

/**
 * Admin "Agreements" — an in-house, PandaDoc-style e-signature manager.
 *
 * An admin creates a legal document from a template addressed to a
 * prospect (a member who reserved a trip) and SENDS it. The prospect
 * signs in-app; the admin then COUNTER-SIGNS, which marks the agreement
 * `completed` and converts the prospect into a confirmed client.
 *
 * Persistence is entirely through use-agreements.ts (createAgreement →
 * sendAgreement → [prospect signs] → countersign). The recipient picker
 * is fed by a live admin-wide listener over `tripReservations` — the same
 * approach the Leads page uses (Firestore rules let admins read it all).
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileSignature,
  Plus,
  Send,
  Eye,
  Trash2,
  Ban,
  PenLine,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useTrips } from "@/lib/use-trips";
import { useAgreements, sortAgreements } from "@/lib/use-agreements";
import {
  AGREEMENT_STATUS_LABEL,
  type Agreement,
  type AgreementStatus,
  type NewAgreement,
} from "@/lib/agreements-data";
import {
  AgreementFormDialog,
  CountersignDialog,
  useAllReservations,
} from "@/components/admin/agreement-form";

/* ------------------------------------------------------------------ */
/* Status presentation                                                 */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS: { value: "all" | AgreementStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: AGREEMENT_STATUS_LABEL.draft },
  { value: "sent", label: AGREEMENT_STATUS_LABEL.sent },
  { value: "prospect_signed", label: AGREEMENT_STATUS_LABEL.prospect_signed },
  { value: "completed", label: AGREEMENT_STATUS_LABEL.completed },
  { value: "void", label: AGREEMENT_STATUS_LABEL.void },
];

function StatusBadge({ status }: { status: AgreementStatus }) {
  const label = AGREEMENT_STATUS_LABEL[status];
  if (status === "draft") {
    return (
      <Badge variant="secondary" className="text-[10px] h-5 text-muted-foreground">
        {label}
      </Badge>
    );
  }
  if (status === "sent") {
    return (
      <Badge variant="default" className="text-[10px] h-5">
        {label}
      </Badge>
    );
  }
  if (status === "prospect_signed") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      >
        {label}
      </Badge>
    );
  }
  if (status === "completed") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] h-5 text-muted-foreground">
      {label}
    </Badge>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function AgreementsInner() {
  const user = useAuth((s) => s.user);
  const confirm = useConfirm();
  const searchParams = useSearchParams();

  const {
    agreements,
    loading,
    error,
    createAgreement,
    sendAgreement,
    countersign,
    voidAgreement,
    deleteAgreement,
  } = useAgreements();
  const { trips } = useTrips();
  const { reservations } = useAllReservations();

  const [filter, setFilter] = useState<"all" | AgreementStatus>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [presetReservationId, setPresetReservationId] = useState<string>("");
  const [countersignFor, setCountersignFor] = useState<Agreement | null>(null);

  // Active reservations only — you don't address a contract to a member
  // who cancelled their seat.
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status !== "cancelled"),
    [reservations],
  );

  // Deep-link from the Leads funnel: ?reservation=<id> opens the New
  // Agreement dialog preselected to that reservation (once per id).
  useEffect(() => {
    const rid = searchParams.get("reservation");
    if (rid) {
      setPresetReservationId(rid);
      setFormOpen(true);
    }
  }, [searchParams]);

  const sorted = useMemo(() => sortAgreements(agreements), [agreements]);
  const visible = useMemo(
    () => (filter === "all" ? sorted : sorted.filter((a) => a.status === filter)),
    [sorted, filter],
  );

  async function handleCreate(payload: NewAgreement): Promise<boolean> {
    const id = await createAgreement(payload);
    if (id) {
      toast.success("Draft agreement created. Send it when you're ready.");
      return true;
    }
    toast.error("Couldn't create the agreement.");
    return false;
  }

  async function handleSend(a: Agreement) {
    const ok = await sendAgreement(a.id);
    if (ok) toast.success(`Sent to ${a.prospectName} for signature.`);
    else toast.error("Couldn't send the agreement.");
  }

  async function handleCountersign(signerName: string): Promise<boolean> {
    if (!countersignFor) return false;
    const ok = await countersign(countersignFor.id, {
      signerName,
      signatureText: signerName,
    });
    if (ok) {
      toast.success(
        `Completed — ${countersignFor.prospectName} is now a confirmed client.`,
      );
      return true;
    }
    toast.error("Couldn't countersign the agreement.");
    return false;
  }

  async function handleVoid(a: Agreement) {
    const ok = await confirm({
      title: `Void "${a.title}"?`,
      description:
        "This cancels the agreement. The traveler can no longer sign it, and it won't convert them to a client.",
      confirmText: "Void agreement",
      destructive: true,
    });
    if (!ok) return;
    const done = await voidAgreement(a.id);
    if (done) toast.success("Agreement voided.");
    else toast.error("Couldn't void the agreement.");
  }

  async function handleDelete(a: Agreement) {
    const ok = await confirm({
      title: `Delete "${a.title}"?`,
      description: "This permanently removes the agreement. This can't be undone.",
      confirmText: "Delete agreement",
      destructive: true,
    });
    if (!ok) return;
    const done = await deleteAgreement(a.id);
    if (done) toast.success("Agreement deleted.");
    else toast.error("Couldn't delete the agreement.");
  }

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
              <FileSignature className="h-6 w-6 text-primary" />
              Agreements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send a trip agreement to a prospect, let them sign, then
              countersign to confirm them as a client. Both parties sign.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setPresetReservationId("");
              setFormOpen(true);
            }}
            className="bg-primary hover:bg-magenta"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> New agreement
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-primary" />
                All agreements ({agreements.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drafts aren&apos;t visible to the traveler until you send them.
              </p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={filter === f.value ? "default" : "ghost"}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "h-7 px-2.5 text-xs",
                    filter === f.value && "bg-primary hover:bg-magenta",
                  )}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                Loading agreements…
              </p>
            ) : error ? (
              <p className="text-xs text-destructive py-4 text-center">
                Couldn&apos;t load agreements. Check your connection and
                Firestore permissions, then refresh.
              </p>
            ) : visible.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                {agreements.length === 0
                  ? 'No agreements yet. Click "New agreement" to draft one.'
                  : "No agreements match this filter."}
              </p>
            ) : (
              <div className="space-y-2">
                {visible.map((a) => (
                  <AgreementRow
                    key={a.id}
                    a={a}
                    onSend={() => handleSend(a)}
                    onCountersign={() => setCountersignFor(a)}
                    onVoid={() => handleVoid(a)}
                    onDelete={() => handleDelete(a)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AgreementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        reservations={activeReservations}
        trips={trips}
        initialReservationId={presetReservationId || undefined}
        onCreate={handleCreate}
      />

      <CountersignDialog
        open={countersignFor !== null}
        onOpenChange={(v) => {
          if (!v) setCountersignFor(null);
        }}
        prospectName={countersignFor?.prospectName ?? ""}
        agreementTitle={countersignFor?.title ?? ""}
        defaultSignerName={user?.name}
        onCountersign={handleCountersign}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function AgreementRow({
  a,
  onSend,
  onCountersign,
  onVoid,
  onDelete,
}: {
  a: Agreement;
  onSend: () => void;
  onCountersign: () => void;
  onVoid: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-rosa/20 px-3 py-2 hover:bg-primary/5">
      <FileSignature className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{a.prospectName}</p>
          <StatusBadge status={a.status} />
          {a.status === "completed" ? (
            <Badge
              variant="outline"
              className="text-[9px] h-4 gap-0.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-2.5 w-2.5" /> Confirmed client
            </Badge>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{a.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          {a.tripTitle ? <span className="truncate">{a.tripTitle}</span> : null}
          {a.tripTitle ? <span>·</span> : null}
          <span className="tabular-nums">{formatDate(a.createdAt)}</span>
          {a.status === "sent" ? (
            <span className="italic">awaiting traveler signature</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {a.status === "draft" ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onSend}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Send
          </Button>
        ) : null}

        {a.status === "prospect_signed" ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-primary"
            onClick={onCountersign}
          >
            <PenLine className="h-3.5 w-3.5 mr-1" /> Countersign
          </Button>
        ) : null}

        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          render={<Link href={`/community/agreements/${a.id}`} />}
          aria-label="View agreement"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>

        {a.status === "sent" || a.status === "prospect_signed" ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={onVoid}
            aria-label="Void agreement"
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        ) : null}

        {a.status === "draft" || a.status === "void" ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete agreement"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AdminAgreementsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AgreementsInner />
    </Suspense>
  );
}
