"use client";

import { useEffect, useState } from "react";
import { useMarqueeContent, saveSiteContent } from "@/lib/use-site-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";

export function MarqueePanel() {
  const { words } = useMarqueeContent();
  const [form, setForm] = useState<string[]>(words);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(words);
  }, [words, dirty]);

  function mut(next: string[]) {
    setDirty(true);
    setForm(next);
  }

  async function save() {
    setSaving(true);
    const ok = await saveSiteContent("marquee", { words: form.map((w) => w.trim()).filter(Boolean) });
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("Marquee saved — live now.");
    } else {
      toast.error("Save failed.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">Scrolling Words</h2>
          <p className="text-[11px] text-white/40">The pink scrolling word strip.</p>
        </div>
        <Button onClick={save} disabled={saving || !dirty} className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110 disabled:opacity-40">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-md space-y-2 p-6">
          {form.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={w}
                onChange={(e) => {
                  const next = [...form];
                  next[i] = e.target.value;
                  mut(next);
                }}
                className="bg-white/5 border-white/10 text-white text-sm h-9 focus-visible:ring-[#FF0099]/30"
              />
              <button onClick={() => mut(form.filter((_, j) => j !== i))} aria-label="Remove word" className="shrink-0 rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => mut([...form, ""])} className="h-7 gap-1 border-white/10 text-[11px] text-white/60 hover:bg-white/5 hover:text-white">
            <Plus className="h-3 w-3" /> Add word
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
