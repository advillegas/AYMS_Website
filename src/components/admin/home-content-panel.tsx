"use client";

import { useEffect, useState } from "react";
import {
  useHomeContent,
  saveSiteContent,
  DEFAULT_HOME,
  type HomeContent,
} from "@/lib/use-site-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, RotateCcw, Type, Hash } from "lucide-react";

const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-white/40";
const inputCls = "bg-white/5 border-white/10 text-white text-sm h-9 focus-visible:ring-[#FF0099]/30";

export function HomeContentPanel() {
  const live = useHomeContent();
  const [form, setForm] = useState<HomeContent>(live);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(live);
  }, [live, dirty]);

  function mutate(next: HomeContent) {
    setDirty(true);
    setForm(next);
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveSiteContent("home", form);
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("Homepage content saved — live now.");
    } else {
      toast.error("Save failed. Make sure you're signed in as an admin.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">Homepage Content</h2>
          <p className="text-[11px] text-white/40">Rotating hero headlines &amp; the stat chips.</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110 disabled:opacity-40">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-8 p-6">
          {/* Rotating headlines */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/70">
                <Type className="h-4 w-4 text-[#FF0099]" />
                <h3 className="text-sm font-semibold">Rotating headlines</h3>
              </div>
              <button
                onClick={() => mutate({ ...form, headlines: DEFAULT_HOME.headlines })}
                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" /> Reset to defaults
              </button>
            </div>
            <p className="text-[11px] text-white/35">
              Each headline has a normal part + an <span className="text-[#FF0099]">accent</span> word (shown in the pink script style). They crossfade every few seconds.
            </p>
            <div className="space-y-2">
              {form.headlines.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={h.before}
                    onChange={(e) => {
                      const headlines = [...form.headlines];
                      headlines[i] = { ...h, before: e.target.value };
                      mutate({ ...form, headlines });
                    }}
                    placeholder="The world is better with "
                    className={inputCls}
                  />
                  <Input
                    value={h.accent}
                    onChange={(e) => {
                      const headlines = [...form.headlines];
                      headlines[i] = { ...h, accent: e.target.value };
                      mutate({ ...form, headlines });
                    }}
                    placeholder="amigas"
                    className={`${inputCls} max-w-[140px] text-[#FACDE8]`}
                  />
                  <button
                    onClick={() => mutate({ ...form, headlines: form.headlines.filter((_, j) => j !== i) })}
                    aria-label="Remove headline"
                    className="shrink-0 rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate({ ...form, headlines: [...form.headlines, { before: "", accent: "" }] })} className="h-7 gap-1 border-white/10 text-[11px] text-white/60 hover:bg-white/5 hover:text-white">
              <Plus className="h-3 w-3" /> Add headline
            </Button>
          </section>

          {/* Stats */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white/70">
              <Hash className="h-4 w-4 text-[#FF0099]" />
              <h3 className="text-sm font-semibold">Stat chips</h3>
            </div>
            <div className="space-y-2">
              {form.stats.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    {i === 0 && <label className={labelCls}>Value</label>}
                    <Input
                      value={s.value}
                      onChange={(e) => {
                        const stats = [...form.stats];
                        stats[i] = { ...s, value: e.target.value };
                        mutate({ ...form, stats });
                      }}
                      placeholder="2k+"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    {i === 0 && <label className={labelCls}>Label</label>}
                    <Input
                      value={s.label}
                      onChange={(e) => {
                        const stats = [...form.stats];
                        stats[i] = { ...s, label: e.target.value };
                        mutate({ ...form, stats });
                      }}
                      placeholder="amigas"
                      className={inputCls}
                    />
                  </div>
                  <button
                    onClick={() => mutate({ ...form, stats: form.stats.filter((_, j) => j !== i) })}
                    aria-label="Remove stat"
                    className={`shrink-0 rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 ${i === 0 ? "mt-5" : ""}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate({ ...form, stats: [...form.stats, { value: "", label: "" }] })} className="h-7 gap-1 border-white/10 text-[11px] text-white/60 hover:bg-white/5 hover:text-white">
              <Plus className="h-3 w-3" /> Add stat
            </Button>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
