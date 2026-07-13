"use client";

/**
 * Sponsors photo banner for the camp page.
 *
 * Renders the admin-managed sponsor logos/photos (cms_config key
 * "camp.sponsors") as a polished horizontal band: a gentle infinite
 * marquee when there are enough logos, a centered row otherwise, honoring
 * prefers-reduced-motion. Each sponsor has an optional name + link.
 *
 * Admins manage everything from the in-place editor ("Edit page" on /camp
 * or the section builder): upload photos (through the smart cropper),
 * name/link each one, reorder, and remove. Visitors see nothing until at
 * least one sponsor is added.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Handshake,
  Images,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useInlineEdit } from "@/lib/use-inline-edit";
import {
  useCampSponsors,
  saveSiteContent,
  CAMP_SPONSORS_KEY,
  type SponsorItem,
} from "@/lib/use-site-content";
import { EditableText } from "@/components/inline/editable-text";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { useImageCropper } from "@/components/admin/image-cropper";
import { MediaLibraryDialog } from "@/components/admin/media-library-dialog";
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
import { EASE } from "./shared";

function SponsorCard({ item }: { item: SponsorItem }) {
  const inner = (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-[#221019]/8 bg-white px-7 py-4 elevate-2 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="relative h-16 w-36 sm:h-20 sm:w-44">
        <Image
          src={item.image}
          alt={item.name || "Sponsor"}
          fill
          unoptimized
          sizes="176px"
          className="object-contain"
        />
      </div>
      {item.name.trim() && (
        <span className="max-w-44 truncate text-xs font-semibold tracking-wide text-ink-soft">
          {item.name}
        </span>
      )}
    </div>
  );
  const href = ensureHttp(item.href);
  if (!href) return inner;
  const external = /^https?:/i.test(href);
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={item.name || "Sponsor"}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] rounded-2xl"
    >
      {inner}
    </a>
  );
}

export function CampSponsors() {
  const { items } = useCampSponsors();
  const editing = useInlineEdit((s) => s.enabled);
  const reduceMotion = useReducedMotion();
  const [manageOpen, setManageOpen] = useState(false);

  // Nothing configured and not editing → the section disappears entirely.
  if (items.length === 0 && !editing) return null;

  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  };

  // A marquee with too few logos looks broken — scroll only when full.
  const marquee = !reduceMotion && items.length >= 5;
  const track = items.map((s) => (
    <div key={s.id} className="shrink-0">
      <SponsorCard item={s} />
    </div>
  ));

  return (
    <section className="canvas-warm grain relative overflow-hidden border-y border-[#FF7F50]/15 py-16 sm:py-20">
      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div {...reveal}>
          <div className="pill-glass mx-auto mb-4 flex w-fit items-center gap-2 px-4 py-1.5">
            <Handshake className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
            <EditableText id="camp.sponsors.eyebrow" as="span" className="eyebrow text-[#B51760]">
              With love from our sponsors
            </EditableText>
          </div>
          <h2 className="text-title font-display text-ink">
            <EditableText id="camp.sponsors.title" as="span">
              {"Camp is possible thanks to "}
            </EditableText>
            <EditableText
              id="camp.sponsors.titleAccent"
              as="span"
              className="font-display-italic marker-swipe text-[#B51760]"
            >
              estas marcas
            </EditableText>
          </h2>
        </motion.div>

        {items.length === 0 ? (
          <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--magenta)]/30 bg-white/60 px-6 py-10">
            <Images className="h-8 w-8 text-[var(--magenta)]/50" aria-hidden="true" />
            <p className="text-sm text-ink-soft">
              No sponsors yet — add photos or logos and they&apos;ll appear
              here as a banner. Visitors don&apos;t see this section until you
              add one.
            </p>
          </div>
        ) : marquee ? (
          <motion.div {...reveal} className="relative mt-10" aria-label="Our sponsors">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--cream,#FDFCF7)] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--cream,#FDFCF7)] to-transparent" />
            <div className="overflow-hidden">
              <div className="flex w-max animate-[marquee_36s_linear_infinite] gap-5 pr-5">
                {track}
                {track}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            {...reveal}
            className="mt-10 flex flex-wrap items-stretch justify-center gap-5"
            aria-label="Our sponsors"
          >
            {track}
          </motion.div>
        )}

        {editing && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setManageOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--magenta)]/60 bg-white/80 px-4 py-2 text-xs font-semibold text-[var(--magenta)] shadow-sm transition-colors hover:bg-[var(--magenta)]/5"
              title="Add, reorder, link, or remove sponsor photos"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Manage sponsors
            </button>
          </div>
        )}
      </div>

      {editing && (
        <SponsorsEditorDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          items={items}
        />
      )}
    </section>
  );
}

/* ------------------------- sponsors editor -------------------------- */

function newSponsorId(): string {
  return `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function SponsorsEditorDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: SponsorItem[];
}) {
  const requestCrop = useImageCropper();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<SponsorItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Re-seed the draft each time the dialog opens (not on live updates
  // mid-edit, which would clobber typing).
  useEffect(() => {
    if (open) setDraft(items.map((s) => ({ ...s })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function patch(i: number, p: Partial<SponsorItem>) {
    setDraft((d) => d.map((s, idx) => (idx === i ? { ...s, ...p } : s)));
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const cropped = await requestCrop(file, { title: "Crop sponsor photo" });
    if (!cropped) return;
    setUploading(true);
    try {
      const url = await uploadCmsMedia(cropped);
      setDraft((d) => [...d, { id: newSponsorId(), image: url, name: "", href: "" }]);
    } catch {
      toast.error("Couldn't upload that photo. Use an image under ~5MB.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const cleaned = draft
      .filter((s) => s.image.trim())
      .map((s) => ({ ...s, name: s.name.trim(), href: s.href.trim() }));
    setSaving(true);
    const ok = await saveSiteContent(CAMP_SPONSORS_KEY, { items: cleaned });
    setSaving(false);
    if (ok) {
      toast.success("Sponsors saved — live for everyone.");
      onOpenChange(false);
    } else {
      toast.error("Couldn't save. Check your connection and try again.");
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Sponsor banner</DialogTitle>
          <DialogDescription>
            Upload sponsor photos or logos, give each an optional name and
            link, and drag the order with the arrows. They render as a
            horizontal banner on the camp page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Upload photo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLibraryOpen(true)}
            className="h-8 gap-1.5"
          >
            <Images className="h-3.5 w-3.5" /> From library
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {draft.length} sponsor{draft.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="max-h-[46vh] space-y-2 overflow-y-auto py-1 pr-1">
          {draft.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sponsors yet. Upload the first photo above.
            </p>
          )}
          {draft.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-border p-2.5"
            >
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                <Image
                  src={s.image}
                  alt={s.name || "Sponsor"}
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-contain"
                />
              </div>
              <div className="grid min-w-0 flex-1 gap-1.5">
                <Input
                  value={s.name}
                  onChange={(e) => patch(i, { name: e.target.value })}
                  placeholder="Sponsor name (optional)"
                  className="h-8 text-xs"
                />
                <Input
                  value={s.href}
                  onChange={(e) => patch(i, { href: e.target.value })}
                  placeholder="Link (optional) — https://…"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex shrink-0 flex-col items-center gap-0.5">
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
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => remove(i)}
                  aria-label="Remove sponsor"
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
              </div>
            </div>
          ))}
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
            Save sponsors
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <MediaLibraryDialog
      open={libraryOpen}
      onOpenChange={setLibraryOpen}
      onSelect={(url) =>
        setDraft((d) => [...d, { id: newSponsorId(), image: url, name: "", href: "" }])
      }
    />
    </>
  );
}
