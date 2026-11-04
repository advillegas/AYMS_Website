"use client";

/**
 * Admin-editable CTA buttons for the camp page (hero + final CTA share one
 * list, stored under cms_config key "camp.cta").
 *
 * Each button is either a "waitlist" button (opens the built-in lead-capture
 * form → newsletter_signups with source "waitlist", surfaced in Admin →
 * Leads) or a "link" button (Stripe Payment Link, internal page, any URL).
 * Admins relabel, repoint, hide, remove, reorder, and add buttons from the
 * in-place editor ("Edit page" on /camp or the section builder); a one-click
 * preset adds the "Pay in full" + "Payment plan" checkout pair. Link buttons
 * without a URL yet are hidden from visitors (shown greyed-out to admins).
 */

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useInlineEdit } from "@/lib/use-inline-edit";
import {
  useCampCta,
  saveSiteContent,
  campCtaKind,
  campPaymentButtonsPreset,
  CAMP_CTA_KEY,
  WAITLIST_HREF,
  type CampCtaButton,
  type CampCtaKind,
} from "@/lib/use-site-content";
import { useNewsletter } from "@/lib/use-newsletter";
import { ensureHttp } from "@/lib/url";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRIMARY_CLS =
  "lift inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-8 py-3 text-base font-semibold text-white shadow-[0_8px_24px_rgb(255_0_153/0.3)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF7]";
const SECONDARY_CLS =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#FF0099]/30 bg-white px-8 py-3 text-base font-semibold text-[#B51760] transition-colors hover:bg-[#FF0099]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/40";

/** A link button with no destination yet — never shown to visitors. */
function isUnlinked(b: CampCtaButton): boolean {
  return campCtaKind(b) === "link" && b.href.trim() === "";
}

export function CampCtaButtons({ className = "" }: { className?: string }) {
  const { buttons } = useCampCta();
  const editing = useInlineEdit((s) => s.enabled);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  // Admins see unlinked buttons greyed out so they know what still needs a
  // URL; visitors never see them.
  const visible = buttons.filter(
    (b) => b.visible !== false && b.label.trim() && (editing || !isUnlinked(b)),
  );

  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      {visible.map((b, i) => {
        const cls = i === 0 ? PRIMARY_CLS : SECONDARY_CLS;
        if (campCtaKind(b) === "waitlist") {
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setWaitlistOpen(true)}
              className={cls}
            >
              {b.label}
              {i === 0 && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          );
        }
        if (isUnlinked(b)) {
          return (
            <button
              key={b.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditorOpen(true);
              }}
              className={`${cls} opacity-50 grayscale`}
              title="No link yet — hidden from visitors. Click to add the link."
            >
              {b.label}
              <span className="text-[10px] font-bold uppercase tracking-wider">· no link</span>
            </button>
          );
        }
        const href = ensureHttp(b.href);
        const external = /^https?:/i.test(href);
        return (
          <a
            key={b.id}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className={cls}
          >
            {b.label}
            {i === 0 && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </a>
        );
      })}

      {editing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditorOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 self-center rounded-full border border-dashed border-[var(--magenta)]/60 bg-white/80 px-4 py-2 text-xs font-semibold text-[var(--magenta)] shadow-sm transition-colors hover:bg-[var(--magenta)]/5"
          title="Edit these buttons (label, link, show/hide, add, remove)"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit buttons
        </button>
      )}

      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} />
      {editing && (
        <CtaEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          buttons={buttons}
        />
      )}
    </div>
  );
}

/* ------------------------- waitlist capture ------------------------- */

/**
 * Lead-capture form feeding the existing pipeline: POSTs through
 * /api/newsletter/subscribe (rate-limited) with source "waitlist" and
 * tripId "camp", so entries show up in Admin → Leads → Newsletter
 * signups tagged Waitlist/camp.
 */
function WaitlistDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { submitting, subscribe } = useNewsletter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await subscribe({
      email,
      name: name.trim() || undefined,
      source: "waitlist",
      tripId: "camp",
    });
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    setDone(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setName("");
          setEmail("");
          setDone(false);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            </div>
            <DialogTitle className="font-display text-xl">
              You&apos;re on the list, amiga!
            </DialogTitle>
            <DialogDescription className="mt-2">
              We&apos;ll reach out the moment a spot opens up. ♡
            </DialogDescription>
            <Button
              className="mt-5 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-6 text-white hover:brightness-110"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Join the Camp waitlist
              </DialogTitle>
              <DialogDescription>
                Leave your details and we&apos;ll contact you when a bunk opens
                up.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-1">
              <div className="grid gap-1.5">
                <Label htmlFor="waitlist-name">Name (optional)</Label>
                <Input
                  id="waitlist-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="waitlist-email">Email</Label>
                <Input
                  id="waitlist-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110"
                >
                  {submitting ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Join the waitlist
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- CTA editor ----------------------------- */

function newButton(): CampCtaButton {
  return {
    id: `cta-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    label: "New button",
    href: "",
    visible: true,
    kind: "link",
  };
}

function isStripeLink(href: string): boolean {
  return /^(https?:\/\/)?(buy|checkout)\.stripe\.com\//i.test(href.trim());
}

function CtaEditorDialog({
  open,
  onOpenChange,
  buttons,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  buttons: CampCtaButton[];
}) {
  const [draft, setDraft] = useState<CampCtaButton[]>([]);
  const [saving, setSaving] = useState(false);

  // Re-seed the draft each time the dialog opens (not on live updates
  // mid-edit, which would clobber typing).
  useEffect(() => {
    if (open) setDraft(buttons.map((b) => ({ ...b })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function patch(i: number, p: Partial<CampCtaButton>) {
    setDraft((d) => d.map((b, idx) => (idx === i ? { ...b, ...p } : b)));
  }
  function move(i: number, dir: -1 | 1) {
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
  }
  function setKind(i: number, kind: CampCtaKind) {
    setDraft((d) =>
      d.map((b, idx) => {
        if (idx !== i) return b;
        if (kind === "waitlist") return { ...b, kind, href: WAITLIST_HREF };
        // Switching to link: clear the sentinel so the URL field starts empty.
        const href = campCtaKind(b) === "waitlist" ? "" : b.href;
        return { ...b, kind, href };
      }),
    );
  }
  /**
   * Replace the waitlist button(s) with the "Pay in full" + "Payment plan"
   * pair. Non-waitlist buttons the admin already added are kept after them.
   */
  function addPaymentButtons() {
    setDraft((d) => {
      const alreadyThere = d.some((b) => /pay in full|payment plan/i.test(b.label));
      if (alreadyThere) {
        toast.message("Payment buttons are already in the list.");
        return d;
      }
      const kept = d.filter((b) => campCtaKind(b) !== "waitlist");
      return [...campPaymentButtonsPreset(), ...kept];
    });
  }

  const unlinkedCount = draft.filter(
    (b) => b.visible !== false && campCtaKind(b) === "link" && b.href.trim() === "",
  ).length;

  async function handleSave() {
    setSaving(true);
    const ok = await saveSiteContent(CAMP_CTA_KEY, {
      buttons: draft.map((b) => ({
        ...b,
        kind: campCtaKind(b),
        label: b.label.trim(),
        href: campCtaKind(b) === "waitlist" ? WAITLIST_HREF : b.href.trim(),
      })),
    });
    setSaving(false);
    if (ok) {
      toast.success("Buttons saved — live for everyone.");
      onOpenChange(false);
    } else {
      toast.error("Couldn't save. Check your connection and try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Camp call-to-action buttons</DialogTitle>
          <DialogDescription>
            These buttons appear in the camp hero and the closing section. A
            button either opens the built-in waitlist form (signups land in
            Admin → Leads) or goes to a link — paste a Stripe Payment Link
            to take payment. Link buttons without a URL stay hidden from
            visitors until you add one.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto py-1 pr-1">
          {draft.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No buttons — the camp page will show none. Add one below.
            </p>
          )}
          {draft.map((b, i) => (
            <div
              key={b.id}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Button {i + 1} {i === 0 ? "· primary style" : ""}
                </span>
                <div className="ml-auto flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => move(i, 1)}
                    disabled={i === draft.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => patch(i, { visible: b.visible === false })}
                    aria-label={b.visible === false ? "Show button" : "Hide button"}
                    title={b.visible === false ? "Hidden — click to show" : "Visible — click to hide"}
                  >
                    {b.visible === false ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => remove(i)}
                    aria-label="Remove button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={b.label}
                    onChange={(e) => patch(i, { label: e.target.value })}
                    placeholder="e.g. Pay in full"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">When clicked</Label>
                  <div
                    role="radiogroup"
                    aria-label="Button action"
                    className="grid grid-cols-2 overflow-hidden rounded-md border border-border text-xs font-medium"
                  >
                    {(
                      [
                        ["link", "Open a link"],
                        ["waitlist", "Waitlist form"],
                      ] as const
                    ).map(([k, text]) => {
                      const selected = campCtaKind(b) === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setKind(i, k)}
                          className={`px-2 py-2 transition-colors ${
                            selected
                              ? "bg-[var(--magenta)]/15 text-[var(--magenta)]"
                              : "hover:bg-muted"
                          }`}
                        >
                          {text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {campCtaKind(b) === "link" && (
                <div className="grid gap-1">
                  <Label className="text-xs">
                    Link{" "}
                    <span className="font-normal text-muted-foreground">
                      (Stripe Payment Link, /page, or https://…)
                    </span>
                  </Label>
                  <Input
                    value={b.href}
                    onChange={(e) => patch(i, { href: e.target.value })}
                    placeholder="https://buy.stripe.com/…"
                    inputMode="url"
                    autoComplete="off"
                  />
                  {b.href.trim() === "" ? (
                    <p className="text-[11px] text-amber-700">
                      No link yet — this button is hidden from visitors until
                      you paste one.
                    </p>
                  ) : isStripeLink(b.href) ? (
                    <p className="flex items-center gap-1 text-[11px] text-emerald-700">
                      <CreditCard className="h-3 w-3" aria-hidden="true" />
                      Stripe Payment Link — opens Stripe checkout in a new tab.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addPaymentButtons}
              title='Adds "Pay in full" + "Payment plan" link buttons (replacing the waitlist button) — then paste your Stripe links.'
            >
              <CreditCard className="mr-1 h-3.5 w-3.5" /> Add payment buttons
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setDraft((d) => [...d, newButton()])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add button
            </Button>
          </div>
        </div>

        {unlinkedCount > 0 && (
          <p className="text-xs text-amber-700">
            {unlinkedCount === 1
              ? "1 button has no link yet and won't show to visitors."
              : `${unlinkedCount} buttons have no link yet and won't show to visitors.`}{" "}
            You can still save and add the Stripe links later.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110"
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Save buttons
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
