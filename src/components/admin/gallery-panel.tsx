"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGalleryContent, saveSiteContent, type PastTrip } from "@/lib/use-site-content";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, Upload } from "lucide-react";

const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-white/35";
const inputCls = "bg-white/5 border-white/10 text-white text-sm h-9 focus-visible:ring-[#FF0099]/30";

function GalleryRow({ trip, onChange, onRemove }: { trip: PastTrip; onChange: (t: PastTrip) => void; onRemove: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const url = await uploadCmsMedia(file);
      onChange({ ...trip, image: url });
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-white/5">
        {trip.image && <Image src={trip.image} alt="" fill unoptimized className="object-cover" />}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
        <button onClick={() => fileRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white opacity-0 transition-opacity hover:opacity-100">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex-1 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input value={trip.title} onChange={(e) => onChange({ ...trip, title: e.target.value })} placeholder="Title" className={inputCls} />
          <Input value={trip.location} onChange={(e) => onChange({ ...trip, location: e.target.value })} placeholder="Location" className={inputCls} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input value={trip.emoji} onChange={(e) => onChange({ ...trip, emoji: e.target.value })} placeholder="🌎" className={inputCls} />
          <Input type="number" value={trip.year} onChange={(e) => onChange({ ...trip, year: Number(e.target.value) })} placeholder="Year" className={inputCls} />
          <Input type="number" value={trip.amigas} onChange={(e) => onChange({ ...trip, amigas: Number(e.target.value) })} placeholder="# amigas" className={inputCls} />
        </div>
      </div>
      <button onClick={onRemove} aria-label="Remove" className="shrink-0 self-start rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function GalleryPanel() {
  const { pastTrips } = useGalleryContent();
  const [form, setForm] = useState<PastTrip[]>(pastTrips);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (!dirty) setForm(pastTrips);
  }, [pastTrips, dirty]);

  function mut(next: PastTrip[]) {
    setDirty(true);
    setForm(next);
  }

  async function save() {
    setSaving(true);
    const ok = await saveSiteContent("gallery", { pastTrips: form });
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("Gallery saved — live now.");
    } else {
      toast.error("Save failed.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">Past Trips Gallery</h2>
          <p className="text-[11px] text-white/40">The photo wall on the /gallery page.</p>
        </div>
        <Button onClick={save} disabled={saving || !dirty} className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110 disabled:opacity-40">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-3 p-6">
          {form.map((t, i) => (
            <GalleryRow
              key={i}
              trip={t}
              onChange={(nt) => {
                const next = [...form];
                next[i] = nt;
                mut(next);
              }}
              onRemove={async () => {
                const ok = await confirm({
                  title: `Remove “${t.title || "this trip"}”?`,
                  description: "This removes the trip from the gallery. Save changes to make it live.",
                  confirmText: "Remove",
                  destructive: true,
                });
                if (!ok) return;
                mut(form.filter((_, j) => j !== i));
              }}
            />
          ))}
          <Button variant="outline" size="sm" onClick={() => mut([{ title: "New Trip", location: "", emoji: "🌎", amigas: 0, year: new Date().getFullYear(), image: "" }, ...form])} className="h-8 gap-1 border-white/10 text-xs text-white/60 hover:bg-white/5 hover:text-white">
            <Plus className="h-3.5 w-3.5" /> Add past trip
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
