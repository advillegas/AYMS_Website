"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useExperiencesContent, saveSiteContent, type ExperienceItem } from "@/lib/use-site-content";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, Upload } from "lucide-react";

const inputCls = "bg-white/5 border-white/10 text-white text-sm h-9 focus-visible:ring-[#FF0099]/30";

function ExpRow({ item, onChange, onRemove }: { item: ExperienceItem; onChange: (t: ExperienceItem) => void; onRemove: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      onChange({ ...item, image: await uploadCmsMedia(file) });
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-white/5">
        {item.image && <Image src={item.image} alt="" fill unoptimized className="object-cover" />}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
        <button onClick={() => fileRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex-1 space-y-2">
        <Input value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })} placeholder="Experience title" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <Input value={item.location} onChange={(e) => onChange({ ...item, location: e.target.value })} placeholder="Location" className={inputCls} />
          <Input value={item.emoji} onChange={(e) => onChange({ ...item, emoji: e.target.value })} placeholder="🏊‍♀️" className={inputCls} />
        </div>
      </div>
      <button onClick={onRemove} aria-label="Remove" className="shrink-0 self-start rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ExperiencesPanel() {
  const { items } = useExperiencesContent();
  const [form, setForm] = useState<ExperienceItem[]>(items);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(items);
  }, [items, dirty]);

  function mut(next: ExperienceItem[]) {
    setDirty(true);
    setForm(next);
  }

  async function save() {
    setSaving(true);
    const ok = await saveSiteContent("experiences", { items: form });
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("Experiences saved — live now.");
    } else {
      toast.error("Save failed.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">Bucket-List Experiences</h2>
          <p className="text-[11px] text-white/40">The auto-scrolling experience cards on the homepage.</p>
        </div>
        <Button onClick={save} disabled={saving || !dirty} className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110 disabled:opacity-40">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-3 p-6">
          {form.map((it, i) => (
            <ExpRow
              key={i}
              item={it}
              onChange={(ni) => {
                const next = [...form];
                next[i] = ni;
                mut(next);
              }}
              onRemove={() => mut(form.filter((_, j) => j !== i))}
            />
          ))}
          <Button variant="outline" size="sm" onClick={() => mut([...form, { title: "New experience", location: "", emoji: "✨", gradient: "from-[#FF0099] to-[#B51760]", image: "" }])} className="h-8 gap-1 border-white/10 text-xs text-white/60 hover:bg-white/5 hover:text-white">
            <Plus className="h-3.5 w-3.5" /> Add experience
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
