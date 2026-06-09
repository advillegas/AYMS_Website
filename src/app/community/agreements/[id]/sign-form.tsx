"use client";

/**
 * SignForm — the interactive signing surface a prospect sees while an
 * agreement is in the "sent" state.
 *
 * It renders each required disclosure as a checkbox the member must
 * tick, a text input where they type their full legal name as their
 * signature, and a "Sign agreement" button that stays disabled until
 * EVERY disclosure is acknowledged AND the name is non-empty. On submit
 * it hands the acknowledged disclosures + the typed name back up to the
 * page, which persists them via signAsProspect().
 *
 * Validation lives here at the boundary: the parent can trust that
 * onSign only fires with a non-empty name and fully-acknowledged
 * disclosures.
 */

import { useMemo, useState } from "react";
import { Loader2, PenLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DisclosureAck } from "@/lib/agreements-data";

interface SignFormProps {
  /** Disclosures from the agreement (acknowledged flags ignored on input). */
  disclosures: DisclosureAck[];
  /** Pre-fill the signature field with the member's account name. */
  defaultName: string;
  /** Persist the signature. Returns true on success. */
  onSign: (input: {
    signerName: string;
    disclosures: DisclosureAck[];
  }) => Promise<boolean>;
}

export function SignForm({ disclosures, defaultName, onSign }: SignFormProps) {
  // Track each disclosure's acknowledged state by id, seeded false.
  const [acks, setAcks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(disclosures.map((d) => [d.id, false])),
  );
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);

  const allAcked = useMemo(
    () => disclosures.every((d) => acks[d.id]),
    [disclosures, acks],
  );
  const nameFilled = name.trim().length > 0;
  const canSign = allAcked && nameFilled && !submitting;

  async function handleSign() {
    const signerName = name.trim();
    // Boundary validation — never submit a partial signature.
    if (!signerName || !disclosures.every((d) => acks[d.id])) return;
    setSubmitting(true);
    const acknowledged: DisclosureAck[] = disclosures.map((d) => ({
      ...d,
      acknowledged: true,
    }));
    const ok = await onSign({ signerName, disclosures: acknowledged });
    // On success the realtime subscription flips the view to
    // prospect_signed and unmounts this form, so only reset on failure.
    if (!ok) setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      {/* Disclosures checklist */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-4 w-4" />
          Please acknowledge
        </legend>
        <p className="text-xs text-muted-foreground">
          Tick each box to confirm you&apos;ve read and understood the terms
          below.
        </p>
        <ul className="space-y-2.5">
          {disclosures.map((d) => {
            const checked = !!acks[d.id];
            return (
              <li key={d.id}>
                <Label
                  htmlFor={`ack-${d.id}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-rosa/20 hover:border-primary/30 hover:bg-primary/5",
                  )}
                >
                  <Checkbox
                    id={`ack-${d.id}`}
                    checked={checked}
                    onCheckedChange={(v) =>
                      setAcks((prev) => ({ ...prev, [d.id]: !!v }))
                    }
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-snug text-foreground">
                    {d.label}
                  </span>
                </Label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {/* Signature */}
      <div className="space-y-2">
        <Label
          htmlFor="signature-name"
          className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-primary"
        >
          <PenLine className="h-4 w-4" />
          Type your full legal name to sign
        </Label>
        <Input
          id="signature-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Maria Garcia"
          autoComplete="name"
          className="h-11 font-[family-name:var(--font-detail)] text-lg"
          aria-describedby="signature-help"
        />
        <p id="signature-help" className="text-xs text-muted-foreground">
          Typing your name here is your electronic signature and has the same
          legal effect as a handwritten one.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          disabled={!canSign}
          onClick={handleSign}
          className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110 border-0"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Signing…
            </>
          ) : (
            <>
              <PenLine className="mr-1.5 h-4 w-4" />
              Sign agreement
            </>
          )}
        </Button>
        {!canSign && !submitting && (
          <p className="text-center text-xs text-muted-foreground" aria-live="polite">
            {!allAcked
              ? "Acknowledge every item above to continue."
              : "Type your full legal name to enable signing."}
          </p>
        )}
      </div>
    </div>
  );
}
