"use client";

/**
 * Admin-editable CTA buttons for the camp page (hero + final CTA share one
 * list, stored under cms_config key "camp.cta").
 *
 * Replaces the old hardcoded Stripe "buy" buttons. The default is a single
 * "Join the waitlist" button wired to the existing lead-capture pipeline
 * (newsletter_signups / newsletterSignups with source "waitlist", surfaced
 * in Admin → Leads). Admins can relabel, repoint (any URL), hide, remove,
 * reorder, and add buttons from the in-place editor ("Edit page" on /camp
 * or the section builder).
 */

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
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
  CAMP_CTA_KEY,
  WAITLIST_HREF,
  type CampCtaButton,
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

/** True when a button should open the built-in waitlist form. */
function isWaitlistHref(href: string): boolean {
  const h = href.trim().toLowerCase();
  return h === "" || h === WAITLIST_HREF || h === "waitlist";
}

export function CampCtaButtons({ className = "" }: { className?: string }) {
  const { buttons } = useCampCta();
  const editing = useInlineEdit((s) => s.enabled);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const visible = buttons.filter((b) => b.visible !== false && b.label.trim());

  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      {visible.map((b, i) => {
        const cls = i === 0 ? PRIMARY_CLS : SECONDARY_CLS;
        if (isWaitlistHref(b.href)) {
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
    href: WAITLIST_HREF,
    visible: true,
  };
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

  async function handleSave() {
    setSaving(true);
    const ok = await saveSiteContent(CAMP_CTA_KEY, {
      buttons: draft.map((b) => ({ ...b, label: b.label.trim(), href: b.href.trim() })),
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
            These buttons appear in the camp hero and the closing section.
            Leave the link as <code className="text-xs">#waitlist</code> (or
            empty) to open the built-in waitlist form — signups land in
            Admin → Leads.
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
                    placeholder="e.g. Join the waitlist"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Link</Label>
                  <Input
                    value={b.href}
                    onChange={(e) => patch(i, { href: e.target.value })}
                    placeholder="#waitlist, /trips, or https://…"
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setDraft((d) => [...d, newButton()])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add button
          </Button>
        </div>

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
