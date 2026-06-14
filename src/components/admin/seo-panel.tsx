"use client";

import { useEffect, useState } from "react";
import { useSeoContent, saveSiteContent, type SeoMap } from "@/lib/use-site-content";
import { SEO_PAGES } from "@/lib/seo-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Save, Search } from "lucide-react";

const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-white/40";
const inputCls =
  "bg-white/5 border-white/10 text-white text-sm h-9 focus-visible:ring-[#FF0099]/30";
const TITLE_MAX = 60;
const DESC_MAX = 160;

export function SeoPanel() {
  const seo = useSeoContent();
  const [form, setForm] = useState<SeoMap>(seo);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(seo);
  }, [seo, dirty]);

  function set(slug: string, field: "title" | "description", value: string) {
    setDirty(true);
    setForm((f) => ({ ...f, [slug]: { ...f[slug], [field]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveSiteContent("seo", form);
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("SEO saved — search listings update within a couple minutes.");
    } else {
      toast.error("Save failed. Make sure you're signed in as an admin.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">
            Search &amp; SEO
          </h2>
          <p className="text-[11px] text-white/40">
            The title &amp; description Google and social shares show for each page.
          </p>
        </div>
        <Button
          onClick={handleSave}
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

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-7 p-6">
          {SEO_PAGES.map(({ slug, label }) => {
            const entry = form[slug] ?? {};
            const titleLen = (entry.title ?? "").length;
            const descLen = (entry.description ?? "").length;
            return (
              <section
                key={slug}
                className="space-y-3 rounded-xl border border-white/8 bg-white/[0.02] p-4"
              >
                <div className="flex items-center gap-2 text-white/70">
                  <Search className="h-4 w-4 text-[#FF0099]" />
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <span className="ml-auto text-[10px] text-white/25">/{slug === "home" ? "" : slug}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Title tag</label>
                    <span className={`text-[10px] ${titleLen > TITLE_MAX ? "text-amber-400" : "text-white/25"}`}>
                      {titleLen}/{TITLE_MAX}
                    </span>
                  </div>
                  <Input
                    value={entry.title ?? ""}
                    onChange={(e) => set(slug, "title", e.target.value)}
                    className={inputCls}
                    placeholder="Leave blank to use the built-in title"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Meta description</label>
                    <span className={`text-[10px] ${descLen > DESC_MAX ? "text-amber-400" : "text-white/25"}`}>
                      {descLen}/{DESC_MAX}
                    </span>
                  </div>
                  <textarea
                    value={entry.description ?? ""}
                    onChange={(e) => set(slug, "description", e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-md border border-white/10 bg-white/5 p-2.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/30"
                    placeholder="Leave blank to use the built-in description"
                  />
                </div>
              </section>
            );
          })}
          <p className="text-[11px] leading-relaxed text-white/35">
            Tip: keep titles under {TITLE_MAX} characters and descriptions under {DESC_MAX} so
            they don&apos;t get cut off in search results. Blank fields fall back to the
            professionally written defaults.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
