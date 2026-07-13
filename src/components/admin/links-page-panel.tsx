"use client";

/**
 * Editor for the /links (link-in-bio) page. Everything on that page is
 * editable here: profile header (title, handle, bio, avatar), the social
 * icon row, the featured chips, and the main link buttons — with add,
 * delete, and reorder. Persists the whole doc to cms_config under
 * LINKS_PAGE_KEY (same write-through pattern as the other content panels).
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Upload,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  useLinksPageContent,
  saveSiteContent,
  LINKS_PAGE_KEY,
  type LinksPageContent,
  type LinksSocialItem,
  type LinksChipItem,
  type LinksLinkItem,
} from "@/lib/use-site-content";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { useImageCropper } from "@/components/admin/image-cropper";
import { EmojiField } from "@/components/admin/emoji-field";
import { PLATFORM_CHOICES } from "@/lib/social-icons";

const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-white/40";
const inputCls =
  "bg-white/5 border-white/10 text-white text-xs h-8 focus-visible:ring-[#FF0099]/30";
const sectionCls =
  "rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2";
const sectionTitleCls =
  "text-xs font-bold uppercase tracking-wider text-white/60";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function LinksPagePanel() {
  const live = useLinksPageContent();
  const confirm = useConfirm();
  const requestCrop = useImageCropper();
  const [form, setForm] = useState<LinksPageContent>(live);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dirty) setForm(live);
  }, [live, dirty]);

  function mutate(patch: Partial<LinksPageContent>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const cropped = await requestCrop(file, {
      title: "Crop profile photo",
      defaultAspect: "1:1",
    });
    if (!cropped) return;
    setUploading(true);
    try {
      const url = await uploadCmsMedia(cropped);
      if (url) mutate({ avatar: url });
      else toast.error("Upload failed.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    const ok = await saveSiteContent(LINKS_PAGE_KEY, form);
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("Saved! Your links page is live.");
    } else {
      toast.error("Couldn't save", {
        description: "Check your connection or sign in again, then retry.",
      });
    }
  }

  /* ---------- generic list helpers (socials / chips / links) ---------- */

  function listOps<T>(key: "socials" | "chips" | "links") {
    const list = form[key] as T[];
    return {
      update(i: number, patch: Partial<T>) {
        mutate({
          [key]: list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
        } as Partial<LinksPageContent>);
      },
      async remove(i: number, what: string) {
        const ok = await confirm({
          title: `Delete this ${what}?`,
          description: "It disappears from the page when you save.",
          confirmText: "Delete",
          destructive: true,
        });
        if (!ok) return;
        mutate({
          [key]: list.filter((_, idx) => idx !== i),
        } as Partial<LinksPageContent>);
      },
      move(i: number, dir: -1 | 1) {
        const j = i + dir;
        if (j < 0 || j >= list.length) return;
        const next = [...list];
        [next[i], next[j]] = [next[j], next[i]];
        mutate({ [key]: next } as Partial<LinksPageContent>);
      },
      add(item: T) {
        mutate({ [key]: [...list, item] } as Partial<LinksPageContent>);
      },
    };
  }

  const socials = listOps<LinksSocialItem>("socials");
  const chips = listOps<LinksChipItem>("chips");
  const links = listOps<LinksLinkItem>("links");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold text-white">
            Links page
          </h2>
          <p className="text-[11px] text-white/40">
            Your link-in-bio page at{" "}
            <a
              href="/links"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[#FF0099] hover:underline"
            >
              /links <ExternalLink className="h-2.5 w-2.5" />
            </a>
            . Header, socials, chips, and buttons — all editable.
          </p>
        </div>
        <Button
          size="sm"
          onClick={save}
          disabled={saving || !dirty}
          className="gap-1.5 border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110 disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {/* ------------------------- profile ------------------------- */}
          <div className={sectionCls}>
            <h3 className={sectionTitleCls}>Profile header</h3>
            <div className="flex items-center gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5">
                {form.avatar && (
                  <Image src={form.avatar} alt="" fill unoptimized className="object-cover" />
                )}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatar}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="h-8 gap-1.5 border-white/15 bg-white/5 text-xs text-white hover:bg-white/10"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Change photo
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>Title</label>
                <Input
                  value={form.titleBefore}
                  onChange={(e) => mutate({ titleBefore: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Title accent (pink)</label>
                <Input
                  value={form.titleAccent}
                  onChange={(e) => mutate({ titleAccent: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Handle</label>
              <Input
                value={form.handle}
                onChange={(e) => mutate({ handle: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => mutate({ bio: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/30"
              />
            </div>
          </div>

          {/* ------------------------- socials ------------------------- */}
          <div className={sectionCls}>
            <h3 className={sectionTitleCls}>Social icons</h3>
            {form.socials.map((item, i) => (
              <div key={item.id} className="flex items-end gap-2">
                <div className="w-32 space-y-1">
                  <label className={labelCls}>Platform</label>
                  <select
                    value={item.platform}
                    onChange={(e) => socials.update(i, { platform: e.target.value })}
                    className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white"
                  >
                    {PLATFORM_CHOICES.map((p) => (
                      <option key={p.key} value={p.key} className="bg-[#1A0814]">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className={labelCls}>Link</label>
                  <Input
                    value={item.href}
                    onChange={(e) => socials.update(i, { href: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <RowButtons
                  index={i}
                  total={form.socials.length}
                  onMove={(dir) => socials.move(i, dir)}
                  onRemove={() => void socials.remove(i, "social icon")}
                />
              </div>
            ))}
            <AddButton
              label="Add social icon"
              onClick={() =>
                socials.add({ id: uid("s"), platform: "instagram", href: "", label: "" })
              }
            />
          </div>

          {/* -------------------------- chips -------------------------- */}
          <div className={sectionCls}>
            <h3 className={sectionTitleCls}>Featured chips (top row)</h3>
            {form.chips.map((chip, i) => (
              <div key={chip.id} className="flex items-end gap-2">
                <div className="w-40 space-y-1">
                  <label className={labelCls}>Label</label>
                  <Input
                    value={chip.label}
                    onChange={(e) => chips.update(i, { label: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className={labelCls}>Link</label>
                  <Input
                    value={chip.href}
                    onChange={(e) => chips.update(i, { href: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <RowButtons
                  index={i}
                  total={form.chips.length}
                  onMove={(dir) => chips.move(i, dir)}
                  onRemove={() => void chips.remove(i, "chip")}
                />
              </div>
            ))}
            <AddButton
              label="Add chip"
              onClick={() => chips.add({ id: uid("c"), label: "New chip", href: "" })}
            />
          </div>

          {/* ----------------------- link buttons ---------------------- */}
          <div className={sectionCls}>
            <h3 className={sectionTitleCls}>Link buttons</h3>
            {form.links.map((link, i) => (
              <div
                key={link.id}
                className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/70">
                    Button {i + 1}
                  </span>
                  <RowButtons
                    index={i}
                    total={form.links.length}
                    onMove={(dir) => links.move(i, dir)}
                    onRemove={() => void links.remove(i, "link button")}
                  />
                </div>
                <div className="flex items-start gap-2">
                  <div className="shrink-0 space-y-1">
                    <label className={labelCls}>Emoji</label>
                    <EmojiField
                      value={link.emoji}
                      onChange={(emoji) => links.update(i, { emoji })}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                      <label className={labelCls}>Label</label>
                      <Input
                        value={link.label}
                        onChange={(e) => links.update(i, { label: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Link</label>
                      <Input
                        value={link.href}
                        onChange={(e) => links.update(i, { href: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <AddButton
              label="Add link button"
              onClick={() =>
                links.add({ id: uid("l"), emoji: "🔗", label: "New link", href: "" })
              }
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

/* ---------------------------- row chrome ---------------------------- */

function RowButtons({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const base =
    "flex h-7 w-7 items-center justify-center rounded transition-colors disabled:opacity-25";
  return (
    <div className="flex items-center gap-0.5 pb-0.5">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        title="Move up"
        aria-label="Move up"
        className={`${base} text-white/40 hover:bg-white/10 hover:text-white`}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        title="Move down"
        aria-label="Move down"
        className={`${base} text-white/40 hover:bg-white/10 hover:text-white`}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="Delete"
        aria-label="Delete"
        className={`${base} text-white/40 hover:bg-red-500/15 hover:text-red-400`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 py-2.5 text-xs font-medium text-white/60 transition-colors hover:border-[#FF0099]/50 hover:text-white"
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  );
}
