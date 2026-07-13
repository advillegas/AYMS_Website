"use client";

/**
 * Editor for the homepage "Explore by Destination" gallery tiles. Add,
 * delete, reorder, rename, pick the emoji, choose the gradient behind the
 * photo, and upload a tile photo (through the smart cropper). Persists to
 * cms_config under DESTINATIONS_KEY; trip counts on the live tiles stay
 * automatic (computed from published trips by country name).
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  useDestinationsContent,
  saveSiteContent,
  DESTINATIONS_KEY,
  type DestinationItem,
} from "@/lib/use-site-content";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { useImageCropper } from "@/components/admin/image-cropper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Upload,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { EmojiField } from "@/components/admin/emoji-field";
import { useFormDraft } from "@/lib/use-form-draft";
import { DraftBanner, DraftSavedHint } from "@/components/admin/draft-banner";

const inputCls =
  "bg-white/5 border-white/10 text-white text-sm h-9 focus-visible:ring-[#FF0099]/30";

/** Curated gradient presets matching the site's editorial palette. */
const GRADIENT_CHOICES: { label: string; value: string }[] = [
  { label: "Magenta → Coral", value: "from-[var(--magenta)] to-[#C44B3F]" },
  { label: "Gold → Coral", value: "from-[#DAA520] to-[#C44B3F]" },
  { label: "Jungle → Gold", value: "from-[#2D8B6F] to-[#DAA520]" },
  { label: "Magenta → Rosa", value: "from-[var(--magenta)] to-[#FF6BA8]" },
  { label: "Gold → Earth", value: "from-[#DAA520] to-[#8B4513]" },
  { label: "Coral → Gold", value: "from-[#C44B3F] to-[#DAA520]" },
  { label: "Plum → Magenta", value: "from-[#9B2C8A] to-[var(--magenta)]" },
  { label: "Ocean → Jungle", value: "from-[#2D6BB8] to-[#2D8B6F]" },
  { label: "Magenta → Pink", value: "from-[#FF0099] to-[#B51760]" },
];

function DestRow({
  item,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  item: DestinationItem;
  index: number;
  total: number;
  onChange: (t: DestinationItem) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const requestCrop = useImageCropper();

  async function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    // Tiles render ~square (aspect 20/19), so default the crop to 1:1.
    const cropped = await requestCrop(file, {
      title: `Crop ${item.name || "destination"} photo`,
      defaultAspect: "1:1",
    });
    if (!cropped) return;
    setUploading(true);
    try {
      onChange({ ...item, image: await uploadCmsMedia(cropped) });
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const gradientIsPreset = GRADIENT_CHOICES.some((g) => g.value === item.gradient);

  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white/5">
        <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
        {item.image && (
          <Image src={item.image} alt="" fill unoptimized className="object-cover" />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImg}
        />
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Upload photo"
          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={item.name}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
            placeholder="Destination name (matches trip country for live counts)"
            className={inputCls}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EmojiField
            value={item.emoji}
            onChange={(emoji) => onChange({ ...item, emoji })}
          />
          <select
            value={gradientIsPreset ? item.gradient : "custom"}
            onChange={(e) => {
              if (e.target.value !== "custom") {
                onChange({ ...item, gradient: e.target.value });
              }
            }}
            aria-label="Background gradient"
            className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white"
          >
            {GRADIENT_CHOICES.map((g) => (
              <option key={g.value} value={g.value} className="bg-[#1A0814]">
                {g.label}
              </option>
            ))}
            {!gradientIsPreset && (
              <option value="custom" className="bg-[#1A0814]">
                Custom (current)
              </option>
            )}
          </select>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-0.5 self-start">
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move up"
          className="rounded-md p-1.5 text-white/30 hover:bg-white/10 hover:text-white disabled:opacity-25"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          aria-label="Move down"
          className="rounded-md p-1.5 text-white/30 hover:bg-white/10 hover:text-white disabled:opacity-25"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRemove}
          aria-label="Remove"
          className="rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function DestinationsPanel() {
  const { items } = useDestinationsContent();
  const [form, setForm] = useState<DestinationItem[]>(items);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (!dirty) setForm(items);
  }, [items, dirty]);

  // Draft autosave so switching admin tabs (which unmounts this panel) never
  // loses unsaved edits. Gate on `dirty` so a pristine panel writes no draft.
  const draft = useFormDraft<DestinationItem[]>("panel:destinations");
  const latestRef = useRef(form);
  latestRef.current = form;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirty) draft.save(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty]);

  useEffect(
    () => () => {
      if (dirtyRef.current) draft.saveNow(latestRef.current);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function handleRestore() {
    const d = draft.getDraft();
    if (d) {
      setForm(d);
      setDirty(true);
    }
    draft.dismiss();
  }

  function mut(next: DestinationItem[]) {
    setDirty(true);
    setForm(next);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= form.length) return;
    const next = [...form];
    [next[i], next[j]] = [next[j], next[i]];
    mut(next);
  }

  async function save() {
    setSaving(true);
    const ok = await saveSiteContent(DESTINATIONS_KEY, { items: form });
    setSaving(false);
    if (ok) {
      setDirty(false);
      draft.clear();
      toast.success("Destinations saved — live now.");
    } else {
      toast.error("Save failed.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">
            Destination tiles
          </h2>
          <p className="text-[11px] text-white/40">
            The &ldquo;Explore by Destination&rdquo; gallery on the homepage.
            Trip counts appear automatically when a tile&apos;s name matches a
            published trip&apos;s country.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <DraftSavedHint savedAt={draft.draftSavedAt} />}
          <Button
            onClick={save}
            disabled={saving || !dirty}
            className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-3 p-6">
          {draft.hasDraft && (
            <DraftBanner
              savedAt={draft.draftSavedAt}
              label="destinations edit"
              onRestore={handleRestore}
              onDiscard={draft.clear}
            />
          )}
          {form.map((it, i) => (
            <DestRow
              key={i}
              item={it}
              index={i}
              total={form.length}
              onChange={(ni) => {
                const next = [...form];
                next[i] = ni;
                mut(next);
              }}
              onMove={(dir) => move(i, dir)}
              onRemove={async () => {
                const ok = await confirm({
                  title: `Remove “${it.name || "this destination"}”?`,
                  description:
                    "This removes the tile from the homepage gallery. Save changes to make it live.",
                  confirmText: "Remove",
                  destructive: true,
                });
                if (!ok) return;
                mut(form.filter((_, j) => j !== i));
              }}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              mut([
                ...form,
                {
                  name: "New destination",
                  emoji: "🌍",
                  gradient: "from-[#FF0099] to-[#B51760]",
                  image: "",
                },
              ])
            }
            className="h-8 gap-1 border-white/10 text-xs text-white/60 hover:bg-white/5 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add destination
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
