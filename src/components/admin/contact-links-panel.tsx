"use client";

/**
 * Editor for the Contact section's social / contact tiles. Add, delete,
 * reorder, pick a platform (which sets the brand glyph + tint), set the
 * link, optionally upload a custom icon image, and edit EN + ES copy.
 * Persists the whole array to cms_config under CONTACT_LINKS_KEY.
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
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  useContactLinks,
  saveSiteContent,
  CONTACT_LINKS_KEY,
  NEW_CONTACT_LINK,
  type ContactLinkItem,
} from "@/lib/use-site-content";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { PLATFORM_CHOICES, getPlatform } from "@/lib/social-icons";

const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-white/40";
const inputCls =
  "bg-white/5 border-white/10 text-white text-xs h-8 focus-visible:ring-[#FF0099]/30";

export function ContactLinksPanel() {
  const live = useContactLinks();
  const confirm = useConfirm();
  const [form, setForm] = useState<ContactLinkItem[]>(live);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(live);
  }, [live, dirty]);

  function mutate(next: ContactLinkItem[]) {
    setForm(next);
    setDirty(true);
  }
  function update(i: number, patch: Partial<ContactLinkItem>) {
    mutate(form.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function add() {
    mutate([...form, { ...NEW_CONTACT_LINK }]);
  }
  async function remove(i: number) {
    const ok = await confirm({
      title: "Delete this contact link?",
      description: "It will be removed from the page when you save.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    mutate(form.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= form.length) return;
    const next = [...form];
    [next[i], next[j]] = [next[j], next[i]];
    mutate(next);
  }
  async function save() {
    setSaving(true);
    const ok = await saveSiteContent(CONTACT_LINKS_KEY, form);
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("Saved! Your contact links are live.");
    } else {
      toast.error("Couldn't save", {
        description: "Check your connection or sign in again, then retry.",
      });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold text-white">
            Contact &amp; social links
          </h2>
          <p className="text-[11px] text-white/40">
            List your socials. Each tile picks up its platform&apos;s icon, or
            upload your own.
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
        <div className="space-y-3 p-4">
          {form.map((item, i) => (
            <ContactRow
              key={i}
              index={i}
              item={item}
              total={form.length}
              onUpdate={(patch) => update(i, patch)}
              onRemove={() => remove(i)}
              onMove={(dir) => move(i, dir)}
            />
          ))}

          <button
            type="button"
            onClick={add}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 py-3 text-xs font-medium text-white/60 transition-colors hover:border-[#FF0099]/50 hover:text-white"
          >
            <Plus className="h-4 w-4" /> Add link
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}

function ContactRow({
  index,
  item,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  index: number;
  item: ContactLinkItem;
  total: number;
  onUpdate: (patch: Partial<ContactLinkItem>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const plat = getPlatform(item.platform);
  const Icon = plat.Icon;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const url = await uploadCmsMedia(file);
      if (url) onUpdate({ image: url });
      else toast.error("Upload failed.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold text-white/80">
          <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-[#FF0099]/15 text-[#FF0099]">
            {item.image ? (
              <Image src={item.image} alt="" fill unoptimized className="object-cover" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
          </span>
          Link {index + 1}
        </span>
        <div className="flex items-center gap-0.5">
          <IconBtn onClick={() => onMove(-1)} disabled={index === 0} title="Move up">
            <ChevronUp className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn onClick={() => onMove(1)} disabled={index === total - 1} title="Move down">
            <ChevronDown className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn onClick={onRemove} title="Delete" danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className={labelCls}>Platform</label>
            <select
              value={item.platform}
              onChange={(e) => onUpdate({ platform: e.target.value })}
              className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white"
            >
              {PLATFORM_CHOICES.map((p) => (
                <option key={p.key} value={p.key} className="bg-[#1A0814]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Link</label>
            <Input
              value={item.href}
              onChange={(e) => onUpdate({ href: e.target.value })}
              placeholder={plat.placeholder}
              className={inputCls}
            />
          </div>
        </div>

        {/* Custom icon image (overrides the platform glyph) */}
        <div className="space-y-1">
          <label className={labelCls}>Icon image (optional — overrides the glyph)</label>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImg}
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
              {item.image ? "Replace image" : "Upload image"}
            </Button>
            {item.image && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onUpdate({ image: undefined })}
                className="h-8 gap-1 text-xs text-white/50 hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className={labelCls}>Title (EN)</label>
            <Input value={item.enTitle} onChange={(e) => onUpdate({ enTitle: e.target.value })} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Title (ES)</label>
            <Input value={item.esTitle} onChange={(e) => onUpdate({ esTitle: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className={labelCls}>Subtitle (EN)</label>
            <Input value={item.enSub} onChange={(e) => onUpdate({ enSub: e.target.value })} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Subtitle (ES)</label>
            <Input value={item.esSub} onChange={(e) => onUpdate({ esSub: e.target.value })} className={inputCls} />
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={
        "flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-25 " +
        (danger
          ? "text-white/40 hover:bg-red-500/15 hover:text-red-400"
          : "text-white/40 hover:bg-white/10 hover:text-white")
      }
    >
      {children}
    </button>
  );
}
