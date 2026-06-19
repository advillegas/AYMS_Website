"use client";

import { useEffect, useRef, useState } from "react";
import { useMarqueeContent, saveSiteContent } from "@/lib/use-site-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { useFormDraft } from "@/lib/use-form-draft";
import { DraftBanner, DraftSavedHint } from "@/components/admin/draft-banner";

export function MarqueePanel() {
  const { words } = useMarqueeContent();
  const [form, setForm] = useState<string[]>(words);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (!dirty) setForm(words);
  }, [words, dirty]);

  // Draft autosave so switching admin tabs (which unmounts this panel) never
  // loses unsaved edits. Gate on `dirty` so a pristine panel writes no draft.
  const draft = useFormDraft<string[]>("panel:marquee");
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
      draft.clear();
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
        <div className="flex items-center gap-3">
          {dirty && <DraftSavedHint savedAt={draft.draftSavedAt} />}
          <Button onClick={save} disabled={saving || !dirty} className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110 disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-md space-y-2 p-6">
          {draft.hasDraft && (
            <DraftBanner
              savedAt={draft.draftSavedAt}
              label="scrolling words edit"
              onRestore={handleRestore}
              onDiscard={draft.clear}
            />
          )}
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
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "Remove this word?",
                    description: "It will be removed from the scrolling strip. Save changes to make it live.",
                    confirmText: "Remove",
                    destructive: true,
                  });
                  if (!ok) return;
                  mut(form.filter((_, j) => j !== i));
                }}
                aria-label="Remove word"
                className="shrink-0 rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"
              >
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
