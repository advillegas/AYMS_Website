"use client";

/**
 * Member-facing agreement viewer + signing surface.
 *
 * An admin sends a member ("prospect") a legal agreement; this page is
 * where the member reviews the document, acknowledges the required
 * disclosures, and signs by typing their name. Later the admin
 * counter-signs to complete it. Both signatures convert a prospect into
 * a confirmed client.
 *
 * Data: there is no single-doc hook, so we subscribe with
 * useAgreements({ prospectId: user.id }) — which constrains the
 * Firestore query to docs this member is allowed to read — and find the
 * one matching the [id] route param client-side. The [id] segment is
 * read with useParams() from "next/navigation" (per the installed Next
 * docs, useParams is the Client Component hook for dynamic params and
 * returns { id: string } for an app/.../[id]/page route).
 *
 * The "completed" state is print-clean: Tailwind `print:` utilities hide
 * the community chrome and flatten the card so window.print() yields a
 * tidy black-on-white document with both signatures.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Lock,
  Printer,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store";
import { useAgreements } from "@/lib/use-agreements";
import {
  AGREEMENT_STATUS_LABEL,
  type Agreement,
  type AgreementStatus,
  type DisclosureAck,
} from "@/lib/agreements-data";
import { cn } from "@/lib/utils";
import { SignForm } from "./sign-form";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function prettyDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "MMMM d, yyyy 'at' h:mm a") : "";
}

const STATUS_TONE: Record<AgreementStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  prospect_signed: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  void: "bg-muted text-muted-foreground line-through",
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AgreementPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const user = useAuth((s) => s.user);

  // Subscribe scoped to this member (required for Firestore rules); the
  // single doc is found client-side. Skip the query entirely when signed
  // out by passing an empty prospectId only when we have a user.
  const { agreements, loading, signAsProspect } = useAgreements(
    user ? { prospectId: user.id } : { prospectId: "__none__" },
  );

  const agreement = useMemo(
    () => agreements.find((a) => a.id === id),
    [agreements, id],
  );

  /* --- auth gate (mirrors community pages like /community/messages) --- */
  if (!user) {
    return (
      <Shell>
        <EmptyNotice
          icon={<Lock className="h-7 w-7" />}
          title="Please sign in to view this agreement"
          body="Agreements are private to the traveler they're addressed to."
          action={
            <Button
              render={<Link href="/login" />}
              className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110 border-0"
            >
              Sign in
            </Button>
          }
        />
      </Shell>
    );
  }

  if (loading && agreements.length === 0) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Loading your agreement…</p>
        </div>
      </Shell>
    );
  }

  if (!agreement) {
    return (
      <Shell>
        <EmptyNotice
          icon={<AlertCircle className="h-7 w-7" />}
          title="Agreement not found"
          body="This agreement doesn't exist, or you don't have access to it."
          action={
            <Button variant="outline" render={<Link href="/community/my-events" />}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to My Upcoming
            </Button>
          }
        />
      </Shell>
    );
  }

  async function handleSign(input: {
    signerName: string;
    disclosures: DisclosureAck[];
  }): Promise<boolean> {
    if (!agreement) return false;
    const ok = await signAsProspect(agreement.id, {
      signerName: input.signerName,
      signatureText: input.signerName,
      disclosures: input.disclosures,
    });
    if (ok) {
      toast.success(
        "Signed — Amigas y Más Social will countersign to confirm your spot 🎉",
      );
    } else {
      toast.error("Couldn't save your signature. Please try again.");
    }
    return ok;
  }

  return (
    <Shell>
      <AgreementDocument agreement={agreement} onSign={handleSign} />
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

function AgreementDocument({
  agreement: a,
  onSign,
}: {
  agreement: Agreement;
  onSign: (input: {
    signerName: string;
    disclosures: DisclosureAck[];
  }) => Promise<boolean>;
}) {
  return (
    <>
      {/* Top bar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" render={<Link href="/community/my-events" />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          My Upcoming
        </Button>
        {a.status === "completed" && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />
            Print / Save as PDF
          </Button>
        )}
      </div>

      {/* Confirmed banner (completed only) */}
      {a.status === "completed" && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-300 print:hidden">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Confirmed — this agreement is fully signed by both parties. Your
            spot is locked in. ♡
          </p>
        </div>
      )}

      {/* The document container — print-clean: white bg, black text. */}
      <article
        className={cn(
          "agreement-doc mx-auto max-w-2xl rounded-2xl bg-white px-6 py-7 text-ink ring-1 ring-foreground/10 sm:px-10 sm:py-9",
          "print:max-w-none print:rounded-none print:px-0 print:py-0 print:text-black print:shadow-none print:ring-0",
        )}
      >
        {/* Header */}
        <header className="border-b border-rosa/20 pb-5 print:border-black/15">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-primary print:text-black">
              <FileText className="h-5 w-5 print:hidden" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Amigas y Más Social
              </span>
            </div>
            <Badge
              className={cn("print:hidden", STATUS_TONE[a.status])}
              variant="secondary"
            >
              {AGREEMENT_STATUS_LABEL[a.status]}
            </Badge>
          </div>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold leading-tight text-ink print:text-black sm:text-3xl">
            {a.title}
          </h1>
          {a.tripTitle && (
            <p className="mt-1 text-sm text-ink-soft print:text-black/70">
              Trip: {a.tripTitle}
            </p>
          )}
        </header>

        {/* Body — plain text with blank-line paragraphs; pre-line renders it.
            Serif (Cormorant) for a document feel. */}
        <div
          className={cn(
            "mt-6 whitespace-pre-line font-[family-name:var(--font-detail)] text-[1.05rem] leading-relaxed text-ink/90",
            "print:text-black",
          )}
        >
          {a.bodyMarkdown}
        </div>

        {/* Status-specific zone */}
        <div className="mt-8 border-t border-rosa/20 pt-6 print:border-black/15">
          <StatusZone agreement={a} onSign={onSign} />
        </div>
      </article>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Status-specific rendering                                           */
/* ------------------------------------------------------------------ */

function StatusZone({
  agreement: a,
  onSign,
}: {
  agreement: Agreement;
  onSign: (input: {
    signerName: string;
    disclosures: DisclosureAck[];
  }) => Promise<boolean>;
}) {
  switch (a.status) {
    case "draft":
      return (
        <InlineNote tone="muted" icon={<Clock3 className="h-4 w-4" />}>
          This agreement isn&apos;t ready yet — you&apos;ll be notified when
          it&apos;s sent to you.
        </InlineNote>
      );

    case "sent":
      return (
        <SignForm
          disclosures={a.disclosures}
          defaultName={a.prospectName}
          onSign={onSign}
        />
      );

    case "prospect_signed":
      return (
        <div className="space-y-5">
          <InlineNote tone="primary" icon={<Clock3 className="h-4 w-4" />}>
            You signed on {prettyDate(a.prospectSignedAt)}. Awaiting
            confirmation from Amigas y Más Social.
          </InlineNote>
          <AcknowledgedList disclosures={a.disclosures} />
          <SignatureBlock
            label="Traveler"
            name={a.prospectSignerName ?? a.prospectName}
            signedAt={a.prospectSignedAt}
          />
        </div>
      );

    case "completed":
      return (
        <div className="space-y-5">
          <AcknowledgedList disclosures={a.disclosures} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SignatureBlock
              label="Traveler"
              name={a.prospectSignerName ?? a.prospectName}
              signedAt={a.prospectSignedAt}
            />
            <SignatureBlock
              label="Amigas y Más Social"
              name={a.adminSignerName ?? "Amigas y Más Social"}
              signedAt={a.adminSignedAt}
            />
          </div>
        </div>
      );

    case "void":
      return (
        <InlineNote tone="muted" icon={<XCircle className="h-4 w-4" />}>
          This agreement was voided.
        </InlineNote>
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Read-only signature + disclosure displays                           */
/* ------------------------------------------------------------------ */

function SignatureBlock({
  label,
  name,
  signedAt,
}: {
  label: string;
  name: string;
  signedAt?: string;
}) {
  return (
    <div className="rounded-xl border border-rosa/20 bg-blush/10 px-4 py-3 print:border-black/20 print:bg-transparent">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground print:text-black/60">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-detail)] text-2xl italic text-ink print:text-black">
        {name}
      </p>
      <p className="mt-1 text-xs text-muted-foreground print:text-black/60">
        {signedAt ? `Signed ${prettyDate(signedAt)}` : "Not yet signed"}
      </p>
    </div>
  );
}

function AcknowledgedList({ disclosures }: { disclosures: DisclosureAck[] }) {
  if (disclosures.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-black/60">
        Acknowledged disclosures
      </p>
      <ul className="space-y-1.5">
        {disclosures.map((d) => (
          <li
            key={d.id}
            className="flex items-start gap-2 text-sm text-ink/90 print:text-black"
          >
            <CheckCircle2
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                d.acknowledged
                  ? "text-emerald-600 print:text-black"
                  : "text-muted-foreground/40",
              )}
            />
            <span>{d.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function InlineNote({
  tone,
  icon,
  children,
}: {
  tone: "muted" | "primary";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm print:border-black/15 print:text-black",
        tone === "primary"
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-rosa/20 bg-muted/40 text-muted-foreground",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

/** Page chrome wrapper — scrollable area matching sibling community pages. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-auto print:h-auto print:overflow-visible">
      <div className="mx-auto max-w-3xl px-4 py-6 lg:py-8 print:px-0 print:py-0">
        {children}
      </div>
    </div>
  );
}

function EmptyNotice({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rosa/30 bg-rosa/5 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
