"use client";

import { useEffect, useState } from "react";
import { useFaqContent, saveSiteContent, type FaqCategory } from "@/lib/use-site-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";

const inputCls = "bg-white/5 border-white/10 text-white text-sm h-9 focus-visible:ring-[#FF0099]/30";
const taCls = "w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/30";

export function FaqPanel() {
  const { categories } = useFaqContent();
  const [form, setForm] = useState<FaqCategory[]>(categories);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (!dirty) setForm(categories);
  }, [categories, dirty]);

  function mut(next: FaqCategory[]) {
    setDirty(true);
    setForm(next);
  }

  async function save() {
    setSaving(true);
    const ok = await saveSiteContent("faq", { categories: form });
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("FAQ saved — live now.");
    } else {
      toast.error("Save failed.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">FAQ</h2>
          <p className="text-[11px] text-white/40">Categories &amp; questions on the /faq page.</p>
        </div>
        <Button onClick={save} disabled={saving || !dirty} className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110 disabled:opacity-40">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-6 p-6">
          {form.map((cat, ci) => (
            <div key={ci} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Input
                  value={cat.category}
                  onChange={(e) => {
                    const next = [...form];
                    next[ci] = { ...cat, category: e.target.value };
                    mut(next);
                  }}
                  className={`${inputCls} font-semibold`}
                  placeholder="Category name"
                />
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Remove category “${cat.category || "Untitled"}”?`,
                      description:
                        "This removes the category and all of its questions. Save changes to make it live.",
                      confirmText: "Remove category",
                      destructive: true,
                    });
                    if (!ok) return;
                    mut(form.filter((_, j) => j !== ci));
                  }}
                  aria-label="Remove category"
                  className="shrink-0 rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                {cat.items.map((it, ii) => (
                  <div key={ii} className="rounded-lg border border-white/[0.06] bg-black/20 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={it.q}
                        onChange={(e) => {
                          const next = [...form];
                          const items = [...cat.items];
                          items[ii] = { ...it, q: e.target.value };
                          next[ci] = { ...cat, items };
                          mut(next);
                        }}
                        className={inputCls}
                        placeholder="Question"
                      />
                      <button
                        onClick={() => {
                          const next = [...form];
                          next[ci] = { ...cat, items: cat.items.filter((_, j) => j !== ii) };
                          mut(next);
                        }}
                        aria-label="Remove question"
                        className="shrink-0 rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <textarea
                      value={it.a}
                      rows={2}
                      onChange={(e) => {
                        const next = [...form];
                        const items = [...cat.items];
                        items[ii] = { ...it, a: e.target.value };
                        next[ci] = { ...cat, items };
                        mut(next);
                      }}
                      className={taCls}
                      placeholder="Answer"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = [...form];
                    next[ci] = { ...cat, items: [...cat.items, { q: "", a: "" }] };
                    mut(next);
                  }}
                  className="h-7 gap-1 border-white/10 text-[11px] text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <Plus className="h-3 w-3" /> Add question
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => mut([...form, { category: "New Category", items: [] }])} className="h-8 gap-1 border-white/10 text-xs text-white/60 hover:bg-white/5 hover:text-white">
            <Plus className="h-3.5 w-3.5" /> Add category
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
