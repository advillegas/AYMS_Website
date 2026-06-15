"use client";

import { useState } from "react";
import {
  useTestimonials,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
  type Testimonial,
} from "@/lib/use-testimonials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, Star, Quote } from "lucide-react";

const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-white/35";
const inputCls = "bg-white/5 border-white/10 text-white text-sm h-9 focus-visible:ring-[#FF0099]/30";

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function TestimonialCard({ t }: { t: Testimonial }) {
  const [form, setForm] = useState<Testimonial>(t);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const dirty = JSON.stringify(form) !== JSON.stringify(t);

  function set<K extends keyof Testimonial>(k: K, v: Testimonial[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const ok = await updateTestimonial(t.id, {
      ...form,
      initials: form.initials || initialsFrom(form.name),
    });
    setSaving(false);
    toast[ok ? "success" : "error"](ok ? "Testimonial saved." : "Save failed.");
  }

  async function remove() {
    const confirmed = await confirm({
      title: `Remove ${t.name || "this testimonial"}?`,
      description: "This testimonial will be removed from the homepage immediately.",
      confirmText: "Remove",
      destructive: true,
    });
    if (!confirmed) return;
    const ok = await deleteTestimonial(t.id);
    toast[ok ? "success" : "error"](ok ? "Testimonial removed." : "Delete failed.");
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><label className={labelCls}>Name</label><Input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></div>
        <div className="space-y-1"><label className={labelCls}>Location</label><Input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} /></div>
      </div>
      <div className="space-y-1"><label className={labelCls}>Trip / context</label><Input value={form.trip} onChange={(e) => set("trip", e.target.value)} className={inputCls} placeholder="Cancún 2026" /></div>
      <div className="space-y-1"><label className={labelCls}>Quote (English)</label><textarea value={form.en} onChange={(e) => set("en", e.target.value)} rows={2} className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/30" /></div>
      <div className="space-y-1"><label className={labelCls}>Quote (Spanish)</label><textarea value={form.es} onChange={(e) => set("es", e.target.value)} rows={2} className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/30" /></div>
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
          <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="h-3.5 w-3.5 accent-[#FF0099]" />
          <Star className="h-3 w-3 text-[#FF7F50]" /> Featured
        </label>
        <div className="flex items-center gap-1.5">
          <button onClick={remove} aria-label="Delete testimonial" className="rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
          <Button onClick={save} disabled={saving || !dirty} className="h-7 gap-1 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-[11px] text-white hover:brightness-110 disabled:opacity-40">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsPanel() {
  const { testimonials, loading } = useTestimonials();
  const [adding, setAdding] = useState(false);

  async function add() {
    setAdding(true);
    const ok = await addTestimonial({
      name: "New Amiga",
      location: "",
      trip: "",
      en: "Share what an amiga said about her experience…",
      es: "",
      initials: "NA",
      gradient: "from-[#FF0099] to-[#B51760]",
      featured: false,
    });
    setAdding(false);
    if (!ok) toast.error("Couldn't add — sign in as an admin.");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">Testimonials</h2>
          <p className="text-[11px] text-white/40">What amigas say — shown on the homepage. Saves are live.</p>
        </div>
        <Button onClick={add} disabled={adding} className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110">
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add testimonial
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-3 p-6">
          {loading ? (
            <p className="py-10 text-center text-xs text-white/30">Loading…</p>
          ) : testimonials.length === 0 ? (
            <div className="py-16 text-center">
              <Quote className="mx-auto mb-3 h-8 w-8 text-white/15" />
              <p className="text-sm text-white/40">No testimonials yet. Add the first one ♡</p>
            </div>
          ) : (
            testimonials.map((t) => <TestimonialCard key={t.id} t={t} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
