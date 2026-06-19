"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  useSiteSettings,
  saveSiteContent,
  type SiteSettings,
} from "@/lib/use-site-content";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Save, Upload, Megaphone, Palette, Mail } from "lucide-react";
import { useFormDraft } from "@/lib/use-form-draft";
import { DraftBanner, DraftSavedHint } from "@/components/admin/draft-banner";

const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-white/40";
const inputCls = "bg-white/5 border-white/10 text-white text-sm h-9 focus-visible:ring-[#FF0099]/30";

export function SiteSettingsPanel() {
  const settings = useSiteSettings();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mirror live settings until the admin starts editing; resync after save.
  useEffect(() => {
    if (!dirty) setForm(settings);
  }, [settings, dirty]);

  // Draft autosave so switching admin tabs (which unmounts this panel) never
  // loses unsaved edits. Gate on `dirty` so a pristine panel writes no draft.
  const draft = useFormDraft<SiteSettings>("panel:settings");
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

  function set<K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const url = await uploadCmsMedia(file);
      set("logoUrl", url);
    } catch {
      toast.error("Logo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveSiteContent("settings", form);
    setSaving(false);
    if (ok) {
      setDirty(false);
      draft.clear();
      toast.success("Settings saved — live on the site now.");
    } else {
      toast.error("Save failed. Make sure you're signed in as an admin.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">Site Settings</h2>
          <p className="text-[11px] text-white/40">Global branding, announcement bar &amp; contact — applies across the whole site.</p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <DraftSavedHint savedAt={draft.draftSavedAt} />}
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-2xl space-y-8 p-6">
          {draft.hasDraft && (
            <DraftBanner
              savedAt={draft.draftSavedAt}
              label="settings edit"
              onRestore={handleRestore}
              onDiscard={draft.clear}
            />
          )}
          {/* Branding */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/70">
              <Palette className="h-4 w-4 text-[#FF0099]" />
              <h3 className="text-sm font-semibold">Branding</h3>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Logo</label>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-28 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {form.logoUrl ? (
                    <Image src={form.logoUrl} alt="Logo" width={112} height={56} unoptimized className="max-h-12 w-auto object-contain" />
                  ) : (
                    <span className="text-[10px] text-white/30">No logo</span>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} className="h-8 gap-1.5 border-white/10 text-xs text-white/60 hover:bg-white/5 hover:text-white">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload logo
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Site name</label>
              <Input value={form.siteName} onChange={(e) => set("siteName", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Tagline</label>
              <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Brand colors</label>
              <div className="flex flex-wrap gap-3">
                {([
                  { k: "brandPrimary" as const, label: "Primary" },
                  { k: "brandDeep" as const, label: "Deep" },
                  { k: "brandCoral" as const, label: "Coral" },
                ]).map(({ k, label }) => (
                  <label key={k} className="flex items-center gap-2 text-xs text-white/60">
                    <input
                      type="color"
                      value={form[k]}
                      onChange={(e) => set(k, e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
                      aria-label={`${label} brand color`}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="text-[10px] leading-snug text-white/35">Recolors buttons, headings, links &amp; gradients across the site.</p>
            </div>
          </section>

          {/* Announcement bar */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/70">
              <Megaphone className="h-4 w-4 text-[#FF0099]" />
              <h3 className="text-sm font-semibold">Announcement bar</h3>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.announcementEnabled}
                onChange={(e) => set("announcementEnabled", e.target.checked)}
                className="h-4 w-4 accent-[#FF0099]"
              />
              <span className="text-sm text-white/70">Show the announcement bar at the top of the site</span>
            </label>
            <div className="space-y-1.5">
              <label className={labelCls}>Text</label>
              <Input value={form.announcementText} onChange={(e) => set("announcementText", e.target.value)} className={inputCls} placeholder="Featured Event — Check it out" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Links to</label>
              <Input value={form.announcementHref} onChange={(e) => set("announcementHref", e.target.value)} className={inputCls} placeholder="/featured" />
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/70">
              <Mail className="h-4 w-4 text-[#FF0099]" />
              <h3 className="text-sm font-semibold">Contact &amp; social</h3>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Contact email</label>
              <Input value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={inputCls} placeholder="hello@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Instagram handle (without @)</label>
              <Input value={form.instagramHandle} onChange={(e) => set("instagramHandle", e.target.value)} className={inputCls} placeholder="amigasymassocial" />
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
