"use client";

import { useRef, useState } from "react";
import { useEditMode } from "@/lib/edit-mode";
import { useBuilder, type BuilderElement } from "@/lib/builder-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, Trash2, Copy, Loader2, Images } from "lucide-react";
import { v4 as uuid } from "uuid";
import { cn } from "@/lib/utils";
import { uploadCmsMedia } from "@/lib/supabase-storage";
import { MediaLibraryDialog } from "@/components/admin/media-library-dialog";
import { useImageCropper } from "@/components/admin/image-cropper";

/** Current image width as a clamped percent (20–100) of the content panel. */
function imgWidthPct(w: unknown): number {
  const s = typeof w === "string" ? w : "";
  if (s.trim().endsWith("%")) {
    const n = parseInt(s, 10);
    if (Number.isFinite(n)) return Math.min(100, Math.max(20, n));
  }
  return 100;
}

export function InlinePropsPanel() {
  const selectedElementId = useEditMode((s) => s.selectedElementId);
  const setSelectedElement = useEditMode((s) => s.setSelectedElement);
  const elements = useBuilder((s) => s.elements);

  const found = elements.find((e) => e.id === selectedElementId);
  // Section blocks use SectionPropsPanel; this panel only edits generic blocks.
  const el = found && !found.type.startsWith("section.") ? found : undefined;
  const isOpen = !!el;

  return (
    <div
      className={cn(
        "fixed top-10 right-0 z-[90] flex h-[calc(100vh-40px)] min-h-0 w-full max-w-sm sm:w-72 flex-col bg-[#2A0A1E] border-l border-white/10 shadow-2xl shadow-black/40 transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      {el && <PanelContent element={el} onClose={() => setSelectedElement(null)} />}
    </div>
  );
}

function PanelContent({ element, onClose }: { element: BuilderElement; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const requestCrop = useImageCropper();
  const [uploading, setUploading] = useState(false);
  const [libraryKey, setLibraryKey] = useState<string | null>(null);
  const p = element.props;

  function update(props: Record<string, unknown>) {
    useBuilder.setState((s) => ({
      elements: s.elements.map((e) =>
        e.id === element.id ? { ...e, props: { ...e.props, ...props } } : e,
      ),
    }));
  }

  function handleDelete() {
    useBuilder.setState((s) => ({
      elements: s.elements.filter((e) => e.id !== element.id),
    }));
    useEditMode.setState({ selectedElementId: null });
  }

  function handleDuplicate() {
    useBuilder.setState((s) => {
      const idx = s.elements.findIndex((e) => e.id === element.id);
      if (idx === -1) return s;
      const dup = { ...s.elements[idx], id: uuid(), props: { ...s.elements[idx].props } };
      const els = [...s.elements];
      els.splice(idx + 1, 0, dup);
      return { elements: els };
    });
  }

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    // Crop/adjust images first (videos/GIFs pass straight through).
    const prepared = await requestCrop(file, { title: "Crop & adjust photo" });
    if (!prepared) return;
    setUploading(true);
    try {
      // Real Storage upload → durable URL (not a base64 blob in JSONB).
      const url = await uploadCmsMedia(prepared);
      update({ [key]: url });
    } catch (err) {
      console.error("[builder] media upload failed", err);
    } finally {
      setUploading(false);
    }
  }

  const inputCls = "bg-white/5 border-white/10 text-white text-xs h-8 focus-visible:ring-[#FF0099]/30";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between h-10 px-3 border-b border-white/10 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
          {element.type}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close properties panel"
          title="Close"
          className="rounded text-white/30 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex gap-1.5 px-3 py-2 border-b border-white/10 shrink-0">
        <Button variant="outline" size="sm" onClick={handleDuplicate} className="flex-1 text-[10px] border-white/10 text-white/50 hover:text-white hover:bg-white/5 h-7">
          <Copy className="h-3 w-3 mr-1" aria-hidden="true" /> Duplicate
        </Button>
        <Button variant="outline" size="sm" onClick={handleDelete} className="flex-1 text-[10px] border-red-500/20 text-red-400/60 hover:text-red-300 hover:bg-red-500/10 h-7">
          <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" /> Delete
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable]">
        <div className="space-y-3 p-3 pb-8">
          {element.type === "heading" && (
            <>
              <Field label="Text">
                <Input value={p.text as string} onChange={(e) => update({ text: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Level">
                <select value={p.level as string} onChange={(e) => update({ level: e.target.value })} className={`w-full rounded-md px-2 py-1 text-xs bg-white/5 border border-white/10 text-white`}>
                  <option value="h1">H1 — Large</option>
                  <option value="h2">H2 — Medium</option>
                  <option value="h3">H3 — Small</option>
                </select>
              </Field>
              <Field label="Alignment"><AlignPicker value={p.align as string} onChange={(v) => update({ align: v })} /></Field>
              <Field label="Color"><ColorPicker value={p.color as string} onChange={(v) => update({ color: v })} /></Field>
              <Separator className="bg-white/10" />
              <Field label="Pink text glow"><ToggleBtn value={!!(p.textGlow as boolean)} onChange={(v) => update({ textGlow: v })} /></Field>
              <Field label="Soft float (live site)"><ToggleBtn value={!!(p.ambientFloat as boolean)} onChange={(v) => update({ ambientFloat: v })} /></Field>
            </>
          )}

          {element.type === "text" && (
            <>
              <Field label="Text">
                <textarea value={p.text as string} onChange={(e) => update({ text: e.target.value })} rows={4} className={`w-full rounded-md px-2 py-1.5 resize-none text-xs bg-white/5 border border-white/10 text-white`} />
              </Field>
              <Field label="Font Size"><Input type="number" value={p.fontSize as string} onChange={(e) => update({ fontSize: e.target.value })} className={inputCls} /></Field>
              <Field label="Alignment"><AlignPicker value={p.align as string} onChange={(v) => update({ align: v })} /></Field>
              <Field label="Color"><ColorPicker value={p.color as string} onChange={(v) => update({ color: v })} /></Field>
            </>
          )}

          {element.type === "image" && (
            <>
              <Field label="Image / GIF">
                <input ref={fileRef} type="file" accept="image/*,image/gif" className="hidden" onChange={(e) => handleFileUpload(e, "src")} />
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} className="flex-1 text-[10px] border-white/10 text-white/50 hover:text-white hover:bg-white/5 h-7">
                    {uploading ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" aria-hidden="true" /> Uploading…</>
                    ) : (p.src as string) ? "Change Image / GIF" : "Upload Image / GIF"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLibraryKey("src")} className="shrink-0 text-[10px] border-white/10 text-white/50 hover:text-white hover:bg-white/5 h-7">
                    <Images className="h-3 w-3 mr-1" aria-hidden="true" /> Library
                  </Button>
                </div>
                {(p.src as string) && <img src={p.src as string} alt="" className="mt-2 w-full rounded-lg" />}
              </Field>
              <Field label="Or paste URL"><Input value={p.src as string} onChange={(e) => update({ src: e.target.value })} placeholder="https://… (jpg, png, .gif, GIPHY)" className={inputCls} /></Field>
              <Field label={`Width — ${imgWidthPct(p.width)}% of panel`}>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={5}
                    value={imgWidthPct(p.width)}
                    onChange={(e) => update({ width: `${e.target.value}%` })}
                    aria-label="Image width (percent of panel)"
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#FF0099]"
                  />
                  <button
                    type="button"
                    onClick={() => update({ width: "100%" })}
                    className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] font-medium text-white/60 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                  >
                    Full
                  </button>
                </div>
              </Field>
              <Field label="Alignment"><AlignPicker value={(p.align as string) || "center"} onChange={(v) => update({ align: v })} /></Field>
              <Field label="Alt Text"><Input value={p.alt as string} onChange={(e) => update({ alt: e.target.value })} className={inputCls} /></Field>
              <Field label="Border Radius"><Input type="number" value={p.borderRadius as string} onChange={(e) => update({ borderRadius: e.target.value })} className={inputCls} /></Field>
              <Field label="Soft float (live site)"><ToggleBtn value={!!(p.ambientFloat as boolean)} onChange={(v) => update({ ambientFloat: v })} /></Field>
            </>
          )}

          {element.type === "video" && (
            <>
              <Field label="Video">
                <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, "src")} />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} className="w-full text-[10px] border-white/10 text-white/50 hover:text-white hover:bg-white/5 h-7">
                  {uploading ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" aria-hidden="true" /> Uploading…</>
                  ) : (p.src as string) ? "Change Video" : "Upload Video"}
                </Button>
              </Field>
              <Field label="Or paste URL"><Input value={p.src as string} onChange={(e) => update({ src: e.target.value })} placeholder="YouTube, Vimeo, or .mp4 URL" className={inputCls} /></Field>
              <p className="text-[10px] leading-snug text-white/35">Paste a YouTube or Vimeo link to embed it, or upload an MP4/WebM file.</p>
            </>
          )}

          {element.type === "button" && (
            <>
              <Field label="Text"><Input value={p.text as string} onChange={(e) => update({ text: e.target.value })} className={inputCls} /></Field>
              <Field label="Link URL"><Input value={p.href as string} onChange={(e) => update({ href: e.target.value })} placeholder="/trips or https://..." className={inputCls} /></Field>
              <Field label="Style">
                <select value={p.variant as string} onChange={(e) => update({ variant: e.target.value })} className="w-full rounded-md px-2 py-1 text-xs bg-white/5 border border-white/10 text-white">
                  <option value="primary">Primary (Pink)</option>
                  <option value="outline">Outline</option>
                  <option value="white">White</option>
                </select>
              </Field>
              <Field label="Alignment"><AlignPicker value={p.align as string} onChange={(v) => update({ align: v })} /></Field>
              <Separator className="bg-white/10" />
              <Field label="Custom BG Color"><ColorPicker value={(p.bgColor as string) || "#FF0099"} onChange={(v) => update({ bgColor: v })} /></Field>
              <Field label="Custom Text Color"><ColorPicker value={(p.textColor as string) || "#ffffff"} onChange={(v) => update({ textColor: v })} /></Field>
              <p className="text-[9px] text-white/25">Custom colors override the style preset above.</p>
              <Field label="Shimmer (live site)"><ToggleBtn value={!!(p.shimmerEnabled as boolean)} onChange={(v) => update({ shimmerEnabled: v })} /></Field>
            </>
          )}

          {element.type === "spacer" && (
            <Field label="Height (px)"><Input type="number" value={p.height as string} onChange={(e) => update({ height: e.target.value })} className={inputCls} /></Field>
          )}

          {element.type === "divider" && (
            <>
              <Field label="Color"><ColorPicker value={p.color as string} onChange={(v) => update({ color: v })} /></Field>
              <Field label="Opacity"><Input type="number" step="0.1" min="0" max="1" value={p.opacity as string} onChange={(e) => update({ opacity: e.target.value })} className={inputCls} /></Field>
              <Field label="Width"><Input value={p.width as string} onChange={(e) => update({ width: e.target.value })} className={inputCls} /></Field>
            </>
          )}

          {element.type === "card" && (
            <>
              <Field label="Title"><Input value={p.title as string} onChange={(e) => update({ title: e.target.value })} className={inputCls} /></Field>
              <Field label="Description"><textarea value={p.description as string} onChange={(e) => update({ description: e.target.value })} rows={3} className="w-full rounded-md px-2 py-1.5 resize-none text-xs bg-white/5 border border-white/10 text-white" /></Field>
              <Field label="Emoji / Icon"><Input value={(p.emoji as string) || ""} onChange={(e) => update({ emoji: e.target.value })} placeholder="🌴" className={inputCls} /></Field>
              <Field label="Link URL"><Input value={(p.href as string) || ""} onChange={(e) => update({ href: e.target.value })} placeholder="/trips or https://..." className={inputCls} /></Field>
              <Separator className="bg-white/10" />
              <Field label="Card Image">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full text-[10px] border-white/10 text-white/50 hover:text-white hover:bg-white/5 h-7">
                  {(p.image as string) ? "Change Image" : "Upload Image"}
                </Button>
                {(p.image as string) && <img src={p.image as string} alt="" className="mt-2 w-full rounded-lg" />}
              </Field>
              <Field label="Or paste Image URL"><Input value={(p.image as string) || ""} onChange={(e) => update({ image: e.target.value })} placeholder="https://..." className={inputCls} /></Field>
              <Separator className="bg-white/10" />
              <Field label="Background"><ColorPicker value={p.bgColor as string} onChange={(v) => update({ bgColor: v })} /></Field>
              <Field label="Border Color"><ColorPicker value={p.borderColor as string} onChange={(v) => update({ borderColor: v })} /></Field>
              <Field label="Title Color"><ColorPicker value={(p.textColor as string) || "#ffffff"} onChange={(v) => update({ textColor: v })} /></Field>
              <Field label="Description Color"><ColorPicker value={(p.descColor as string) || "#ffffff99"} onChange={(v) => update({ descColor: v })} /></Field>
              <Separator className="bg-white/10" />
              <Field label="Gradient From"><ColorPicker value={(p.gradientFrom as string) || "#3A0F2A"} onChange={(v) => update({ gradientFrom: v })} /></Field>
              <Field label="Gradient To"><ColorPicker value={(p.gradientTo as string) || "#1A0814"} onChange={(v) => update({ gradientTo: v })} /></Field>
              <p className="text-[9px] text-white/25">Set both gradient colors to override the solid background.</p>

              <Separator className="bg-white/10" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF0099]/60">Effects</p>

              <Field label="Flip on Hover">
                <ToggleBtn value={!!(p.flipEnabled as boolean)} onChange={(v) => update({ flipEnabled: v })} />
              </Field>
              <Field label="Sparkle Burst">
                <ToggleBtn value={!!(p.sparkleEnabled as boolean)} onChange={(v) => update({ sparkleEnabled: v })} />
              </Field>
              <Field label="Glow Flash">
                <ToggleBtn value={!!(p.glowEnabled as boolean)} onChange={(v) => update({ glowEnabled: v })} />
              </Field>

              {!!(p.flipEnabled as boolean) && (
                <>
                  <Separator className="bg-white/10" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF0099]/60">Flip Back Content</p>
                  <Field label="Back Title"><Input value={(p.flipTitle as string) || ""} onChange={(e) => update({ flipTitle: e.target.value })} placeholder="Same as front if empty" className={inputCls} /></Field>
                  <Field label="Back Description"><textarea value={(p.flipDescription as string) || ""} onChange={(e) => update({ flipDescription: e.target.value })} rows={2} placeholder="Same as front if empty" className="w-full rounded-md px-2 py-1.5 resize-none text-xs bg-white/5 border border-white/10 text-white" /></Field>
                  <Field label="Back Gradient From"><ColorPicker value={(p.flipGradientFrom as string) || "#FF0099"} onChange={(v) => update({ flipGradientFrom: v })} /></Field>
                  <Field label="Back Gradient To"><ColorPicker value={(p.flipGradientTo as string) || "#B51760"} onChange={(v) => update({ flipGradientTo: v })} /></Field>
                  <Field label="Back Title Color"><ColorPicker value={(p.flipTextColor as string) || "#ffffff"} onChange={(v) => update({ flipTextColor: v })} /></Field>
                  <Field label="Back Desc Color"><ColorPicker value={(p.flipDescColor as string) || "#ffffffd9"} onChange={(v) => update({ flipDescColor: v })} /></Field>
                </>
              )}

              {!!(p.sparkleEnabled as boolean) && (
                <>
                  <Separator className="bg-white/10" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF0099]/60">Sparkle Settings</p>
                  <Field label="Sparkle Color"><ColorPicker value={(p.sparkleColor as string) || "#ffffff"} onChange={(v) => update({ sparkleColor: v })} /></Field>
                  <Field label="Particle Count"><Input type="number" min="4" max="20" value={(p.sparkleCount as string) || "10"} onChange={(e) => update({ sparkleCount: e.target.value })} className={inputCls} /></Field>
                </>
              )}

              {!!(p.glowEnabled as boolean) && (
                <>
                  <Separator className="bg-white/10" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF0099]/60">Glow Settings</p>
                  <Field label="Glow Color"><ColorPicker value={(p.glowColor as string) || "#FF0099"} onChange={(v) => update({ glowColor: v })} /></Field>
                </>
              )}

              <Separator className="bg-white/10" />
              <Field label="Hover lift"><ToggleBtn value={!!(p.hoverLift as boolean)} onChange={(v) => update({ hoverLift: v })} /></Field>
              <Field label="Border glow"><ToggleBtn value={!!(p.borderGlow as boolean)} onChange={(v) => update({ borderGlow: v })} /></Field>
            </>
          )}

          {element.type === "section" && (
            <>
              <Field label="Background"><ColorPicker value={p.bgColor as string} onChange={(v) => update({ bgColor: v })} /></Field>
              <Field label="Gradient (CSS)"><Input value={(p.bgGradient as string) || ""} onChange={(e) => update({ bgGradient: e.target.value })} placeholder="linear-gradient(...)" className={inputCls} /></Field>
              <Field label="Padding (px)"><Input type="number" value={p.padding as string} onChange={(e) => update({ padding: e.target.value })} className={inputCls} /></Field>
              <Field label="Max Width (px)"><Input type="number" value={p.maxWidth as string} onChange={(e) => update({ maxWidth: e.target.value })} className={inputCls} /></Field>
              <Field label="Top accent line"><ToggleBtn value={!!(p.borderTop as boolean)} onChange={(v) => update({ borderTop: v })} /></Field>
              <Field label="Pattern">
                <select
                  value={(p.patternType as string) || "none"}
                  onChange={(e) => update({ patternType: e.target.value })}
                  className="w-full rounded-md px-2 py-1 text-xs bg-white/5 border border-white/10 text-white"
                >
                  <option value="none">None</option>
                  <option value="dots">Dots</option>
                  <option value="grid">Grid</option>
                </select>
              </Field>
              <Field label="Pattern opacity %"><Input type="number" min="0" max="100" value={(p.patternOpacity as string) || "15"} onChange={(e) => update({ patternOpacity: e.target.value })} className={inputCls} /></Field>
              <Field label="Radial glow %"><Input type="number" min="0" max="100" value={(p.radialGlow as string) || "0"} onChange={(e) => update({ radialGlow: e.target.value })} className={inputCls} /></Field>
            </>
          )}

          {element.type === "hero" && (
            <>
              <Field label="Title"><Input value={p.title as string} onChange={(e) => update({ title: e.target.value })} className={inputCls} /></Field>
              <Field label="Subtitle"><Input value={p.subtitle as string} onChange={(e) => update({ subtitle: e.target.value })} className={inputCls} /></Field>
              <Field label="CTA Text"><Input value={p.ctaText as string} onChange={(e) => update({ ctaText: e.target.value })} className={inputCls} /></Field>
              <Field label="CTA Link"><Input value={p.ctaHref as string} onChange={(e) => update({ ctaHref: e.target.value })} placeholder="/trips" className={inputCls} /></Field>
              <Separator className="bg-white/10" />
              <Field label="Background Image">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "bgImage")} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full text-[10px] border-white/10 text-white/50 hover:text-white hover:bg-white/5 h-7">
                  {(p.bgImage as string) ? "Change Image" : "Upload BG Image"}
                </Button>
                {(p.bgImage as string) && <img src={p.bgImage as string} alt="" className="mt-2 w-full rounded-lg h-20 object-cover" />}
              </Field>
              <Field label="Or paste Image URL"><Input value={(p.bgImage as string) || ""} onChange={(e) => update({ bgImage: e.target.value })} placeholder="https://..." className={inputCls} /></Field>
              <Separator className="bg-white/10" />
              <Field label="BG Gradient"><Input value={p.bgGradient as string} onChange={(e) => update({ bgGradient: e.target.value })} placeholder="linear-gradient(...)" className={inputCls} /></Field>
              <Field label="Overlay Opacity"><Input type="number" step="0.1" min="0" max="1" value={p.overlayOpacity as string} onChange={(e) => update({ overlayOpacity: e.target.value })} className={inputCls} /></Field>
              <Field label="Min Height (px)"><Input type="number" value={p.minHeight as string} onChange={(e) => update({ minHeight: e.target.value })} className={inputCls} /></Field>
              <Field label="Alignment"><AlignPicker value={p.align as string} onChange={(v) => update({ align: v })} /></Field>
              <Separator className="bg-white/10" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF0099]/60">Atmosphere (live)</p>
              <Field label="Bokeh orbs"><ToggleBtn value={p.showBokeh !== false} onChange={(v) => update({ showBokeh: v })} /></Field>
              <Field label="Twinkle stars"><ToggleBtn value={p.showStars !== false} onChange={(v) => update({ showStars: v })} /></Field>
              <Field label="Film noise"><ToggleBtn value={p.showNoise !== false} onChange={(v) => update({ showNoise: v })} /></Field>
              <Field label="Bokeh strength %"><Input type="number" min="1" max="25" value={(p.bokehOpacity as string) || "12"} onChange={(e) => update({ bokehOpacity: e.target.value })} className={inputCls} /></Field>
            </>
          )}

          {element.type === "testimonial" && (
            <>
              <Field label="Quote"><textarea value={p.quote as string} onChange={(e) => update({ quote: e.target.value })} rows={3} className="w-full rounded-md px-2 py-1.5 resize-none text-xs bg-white/5 border border-white/10 text-white" /></Field>
              <Field label="Name"><Input value={p.name as string} onChange={(e) => update({ name: e.target.value })} className={inputCls} /></Field>
              <Field label="Location"><Input value={p.location as string} onChange={(e) => update({ location: e.target.value })} className={inputCls} /></Field>
              <Field label="Trip Name"><Input value={p.tripName as string} onChange={(e) => update({ tripName: e.target.value })} className={inputCls} /></Field>
              <Separator className="bg-white/10" />
              <Field label="Avatar Initials"><Input value={p.avatarInitials as string} onChange={(e) => update({ avatarInitials: e.target.value })} maxLength={3} className={inputCls} /></Field>
              <Field label="Avatar Photo">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "avatarImage")} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full text-[10px] border-white/10 text-white/50 hover:text-white hover:bg-white/5 h-7">
                  {(p.avatarImage as string) ? "Change Photo" : "Upload Photo"}
                </Button>
                {(p.avatarImage as string) && <img src={p.avatarImage as string} alt="" className="mt-2 w-12 h-12 rounded-full object-cover" />}
              </Field>
              <Field label="Or paste Photo URL"><Input value={(p.avatarImage as string) || ""} onChange={(e) => update({ avatarImage: e.target.value })} placeholder="https://..." className={inputCls} /></Field>
              <Separator className="bg-white/10" />
              <Field label="Gradient From"><ColorPicker value={p.gradientFrom as string} onChange={(v) => update({ gradientFrom: v })} /></Field>
              <Field label="Gradient To"><ColorPicker value={p.gradientTo as string} onChange={(v) => update({ gradientTo: v })} /></Field>
              <Field label="Avatar pulse glow"><ToggleBtn value={!!(p.avatarPulseGlow as boolean)} onChange={(v) => update({ avatarPulseGlow: v })} /></Field>
            </>
          )}

          {element.type === "gallery" && (
            <>
              <Field label="Columns"><Input type="number" min="1" max="6" value={p.columns as string} onChange={(e) => update({ columns: e.target.value })} className={inputCls} /></Field>
              <Field label="Gap (px)"><Input type="number" value={p.gap as string} onChange={(e) => update({ gap: e.target.value })} className={inputCls} /></Field>
              <Field label="Border Radius"><Input type="number" value={p.borderRadius as string} onChange={(e) => update({ borderRadius: e.target.value })} className={inputCls} /></Field>
              <Field label="Images">
                <p className="text-[10px] text-white/30">{((p.images as string[]) || []).length} slots — use the canvas to upload</p>
              </Field>
            </>
          )}

          {element.type === "trip-card" && (
            <>
              <Field label="Emoji"><Input value={p.emoji as string} onChange={(e) => update({ emoji: e.target.value })} className={inputCls} /></Field>
              <Field label="Destination"><Input value={p.destination as string} onChange={(e) => update({ destination: e.target.value })} className={inputCls} /></Field>
              <Field label="Dates"><Input value={p.dates as string} onChange={(e) => update({ dates: e.target.value })} className={inputCls} /></Field>
              <Field label="Price"><Input value={p.price as string} onChange={(e) => update({ price: e.target.value })} className={inputCls} /></Field>
              <Field label="Status">
                <select value={p.status as string} onChange={(e) => update({ status: e.target.value })} className="w-full rounded-md px-2 py-1 text-xs bg-white/5 border border-white/10 text-white">
                  <option value="open">Open</option>
                  <option value="waitlist">Waitlist</option>
                  <option value="sold-out">Sold Out</option>
                </select>
              </Field>
              <Field label="Description"><textarea value={p.description as string} onChange={(e) => update({ description: e.target.value })} rows={2} className="w-full rounded-md px-2 py-1.5 resize-none text-xs bg-white/5 border border-white/10 text-white" /></Field>
              <Separator className="bg-white/10" />
              <Field label="Trip Image">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full text-[10px] border-white/10 text-white/50 hover:text-white hover:bg-white/5 h-7">
                  {(p.image as string) ? "Change Image" : "Upload Image"}
                </Button>
                {(p.image as string) && <img src={p.image as string} alt="" className="mt-2 w-full rounded-lg h-20 object-cover" />}
              </Field>
              <Field label="Or paste Image URL"><Input value={(p.image as string) || ""} onChange={(e) => update({ image: e.target.value })} placeholder="https://..." className={inputCls} /></Field>
              <Separator className="bg-white/10" />
              <Field label="CTA Text"><Input value={p.ctaText as string} onChange={(e) => update({ ctaText: e.target.value })} className={inputCls} /></Field>
              <Field label="CTA Link"><Input value={p.ctaHref as string} onChange={(e) => update({ ctaHref: e.target.value })} className={inputCls} /></Field>
              <Field label="Hover lift"><ToggleBtn value={!!(p.hoverLift as boolean)} onChange={(v) => update({ hoverLift: v })} /></Field>
            </>
          )}

          {element.type === "event-card" && (
            <>
              <Field label="Month"><Input value={p.dateMonth as string} onChange={(e) => update({ dateMonth: e.target.value })} maxLength={3} className={inputCls} /></Field>
              <Field label="Day"><Input value={p.dateDay as string} onChange={(e) => update({ dateDay: e.target.value })} maxLength={2} className={inputCls} /></Field>
              <Field label="Title"><Input value={p.title as string} onChange={(e) => update({ title: e.target.value })} className={inputCls} /></Field>
              <Field label="Location"><Input value={p.location as string} onChange={(e) => update({ location: e.target.value })} className={inputCls} /></Field>
              <Field label="Type">
                <select value={p.type as string} onChange={(e) => update({ type: e.target.value })} className="w-full rounded-md px-2 py-1 text-xs bg-white/5 border border-white/10 text-white">
                  <option value="Social">Social</option>
                  <option value="Travel">Travel</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Wellness">Wellness</option>
                  <option value="Networking">Networking</option>
                </select>
              </Field>
              <Field label="Description"><textarea value={p.description as string} onChange={(e) => update({ description: e.target.value })} rows={2} className="w-full rounded-md px-2 py-1.5 resize-none text-xs bg-white/5 border border-white/10 text-white" /></Field>
              <Field label="CTA Text"><Input value={p.ctaText as string} onChange={(e) => update({ ctaText: e.target.value })} className={inputCls} /></Field>
              <Field label="CTA Link"><Input value={p.ctaHref as string} onChange={(e) => update({ ctaHref: e.target.value })} className={inputCls} /></Field>
              <Field label="Hover lift"><ToggleBtn value={!!(p.hoverLift as boolean)} onChange={(v) => update({ hoverLift: v })} /></Field>
            </>
          )}

          {element.type === "pricing" && (
            <>
              <Field label="Title"><Input value={p.title as string} onChange={(e) => update({ title: e.target.value })} className={inputCls} /></Field>
              <Field label="Price"><Input value={p.price as string} onChange={(e) => update({ price: e.target.value })} className={inputCls} /></Field>
              <Field label="Currency"><Input value={p.currency as string} onChange={(e) => update({ currency: e.target.value })} maxLength={3} className={inputCls} /></Field>
              <Field label="Period"><Input value={p.period as string} onChange={(e) => update({ period: e.target.value })} placeholder="per person" className={inputCls} /></Field>
              <Field label="Highlighted">
                <button
                  type="button"
                  onClick={() => update({ highlight: !(p.highlight as boolean) })}
                  aria-pressed={!!(p.highlight as boolean)}
                  className={`w-full rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] ${(p.highlight as boolean) ? "bg-[#FF0099] text-white" : "bg-white/5 text-white/40 border border-white/10"}`}
                >
                  {(p.highlight as boolean) ? "Yes — Most Popular" : "No"}
                </button>
              </Field>
              <Field label="Features">
                <div className="space-y-1">
                  {((p.features as string[]) || []).map((feat, i) => (
                    <div key={i} className="flex gap-1">
                      <Input
                        value={feat}
                        onChange={(e) => {
                          const feats = [...(p.features as string[])];
                          feats[i] = e.target.value;
                          update({ features: feats });
                        }}
                        aria-label={`Feature ${i + 1}`}
                        className={cn(inputCls, "flex-1")}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const feats = (p.features as string[]).filter((_, j) => j !== i);
                          update({ features: feats });
                        }}
                        aria-label={`Remove feature ${i + 1}`}
                        title="Remove feature"
                        className="rounded text-red-400/50 hover:text-red-400 text-xs px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                      ><span aria-hidden="true">×</span></button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => update({ features: [...(p.features as string[]), "New feature"] })}
                    className="rounded text-[10px] text-white/30 hover:text-white/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                  >+ Add feature</button>
                </div>
              </Field>
              <Field label="CTA Text"><Input value={p.ctaText as string} onChange={(e) => update({ ctaText: e.target.value })} className={inputCls} /></Field>
              <Field label="CTA Link"><Input value={p.ctaHref as string} onChange={(e) => update({ ctaHref: e.target.value })} className={inputCls} /></Field>
              <Field label="Hover lift"><ToggleBtn value={!!(p.hoverLift as boolean)} onChange={(v) => update({ hoverLift: v })} /></Field>
            </>
          )}

          {element.type === "countdown" && (
            <>
              <Field label="Target Date"><Input type="date" value={p.targetDate as string} onChange={(e) => update({ targetDate: e.target.value })} className={inputCls} /></Field>
              <Field label="Label"><Input value={p.label as string} onChange={(e) => update({ label: e.target.value })} className={inputCls} /></Field>
              <Field label="Background"><ColorPicker value={p.bgColor as string} onChange={(v) => update({ bgColor: v })} /></Field>
              <Field label="Accent Color"><ColorPicker value={p.accentColor as string} onChange={(v) => update({ accentColor: v })} /></Field>
              <Field label="Pulse glow (live)"><ToggleBtn value={!!(p.pulseGlow as boolean)} onChange={(v) => update({ pulseGlow: v })} /></Field>
            </>
          )}

          {element.type === "columns-2" && (
            <Field label="Gap (px)"><Input type="number" value={p.gap as string} onChange={(e) => update({ gap: e.target.value })} className={inputCls} /></Field>
          )}

          {element.type === "banner" && (
            <>
              <Field label="Text"><Input value={p.text as string} onChange={(e) => update({ text: e.target.value })} className={inputCls} /></Field>
              <Field label="Speed (s)"><Input type="number" value={p.speed as string} onChange={(e) => update({ speed: e.target.value })} className={inputCls} /></Field>
              <Field label="Background"><ColorPicker value={p.bgColor as string} onChange={(v) => update({ bgColor: v })} /></Field>
              <Field label="Text Color"><ColorPicker value={p.textColor as string} onChange={(v) => update({ textColor: v })} /></Field>
              <Field label="Font Size"><Input type="number" value={p.fontSize as string} onChange={(e) => update({ fontSize: e.target.value })} className={inputCls} /></Field>
              <Field label="Shimmer strip (live)"><ToggleBtn value={!!(p.shimmerStrip as boolean)} onChange={(v) => update({ shimmerStrip: v })} /></Field>
            </>
          )}

          {element.type === "image-banner" && (
            <>
              <Field label="Scroll speed (s)"><Input type="number" min="4" value={p.speed as string} onChange={(e) => update({ speed: e.target.value })} className={inputCls} /></Field>
              <Field label="Image height (px)"><Input type="number" value={p.height as string} onChange={(e) => update({ height: e.target.value })} className={inputCls} /></Field>
              <Field label="Gap (px)"><Input type="number" value={p.gap as string} onChange={(e) => update({ gap: e.target.value })} className={inputCls} /></Field>
              <Field label="Border Radius"><Input type="number" value={p.borderRadius as string} onChange={(e) => update({ borderRadius: e.target.value })} className={inputCls} /></Field>
              <Field label="Background"><ColorPicker value={(p.bgColor as string) || ""} onChange={(v) => update({ bgColor: v })} /></Field>
              <Field label="Pause on hover"><ToggleBtn value={!!(p.pauseOnHover as boolean)} onChange={(v) => update({ pauseOnHover: v })} /></Field>
              <Field label="Images">
                <p className="text-[10px] text-white/30">{((p.images as string[]) || []).length} images — upload &amp; reorder on the canvas</p>
              </Field>
            </>
          )}

          {element.type === "faq-item" && (
            <>
              <Field label="Question"><Input value={p.question as string} onChange={(e) => update({ question: e.target.value })} className={inputCls} /></Field>
              <Field label="Answer"><textarea value={p.answer as string} onChange={(e) => update({ answer: e.target.value })} rows={4} className="w-full rounded-md px-2 py-1.5 resize-none text-xs bg-white/5 border border-white/10 text-white" /></Field>
            </>
          )}

          {element.type === "cta-block" && (
            <>
              <Field label="Heading"><Input value={p.heading as string} onChange={(e) => update({ heading: e.target.value })} className={inputCls} /></Field>
              <Field label="Description"><textarea value={p.description as string} onChange={(e) => update({ description: e.target.value })} rows={3} className="w-full rounded-md px-2 py-1.5 resize-none text-xs bg-white/5 border border-white/10 text-white" /></Field>
              <Separator className="bg-white/10" />
              <Field label="Primary Button Text"><Input value={p.primaryText as string} onChange={(e) => update({ primaryText: e.target.value })} className={inputCls} /></Field>
              <Field label="Primary Button Link"><Input value={p.primaryHref as string} onChange={(e) => update({ primaryHref: e.target.value })} className={inputCls} /></Field>
              <Field label="Secondary Button Text"><Input value={p.secondaryText as string} onChange={(e) => update({ secondaryText: e.target.value })} className={inputCls} /></Field>
              <Field label="Secondary Button Link"><Input value={p.secondaryHref as string} onChange={(e) => update({ secondaryHref: e.target.value })} className={inputCls} /></Field>
              <Field label="BG Gradient"><Input value={p.bgGradient as string} onChange={(e) => update({ bgGradient: e.target.value })} placeholder="linear-gradient(...)" className={inputCls} /></Field>
              <Separator className="bg-white/10" />
              <Field label="Primary shimmer (live)"><ToggleBtn value={!!(p.primaryShimmer as boolean)} onChange={(v) => update({ primaryShimmer: v })} /></Field>
              <Field label="Border glow"><ToggleBtn value={!!(p.borderGlow as boolean)} onChange={(v) => update({ borderGlow: v })} /></Field>
            </>
          )}

          <Separator className="bg-white/10" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF0099]/60">Scroll reveal</p>
          <Field label="Animation">
            <select
              value={(p.revealAnimation as string) || "none"}
              onChange={(e) => update({ revealAnimation: e.target.value })}
              className="w-full rounded-md px-2 py-1 text-xs bg-white/5 border border-white/10 text-white"
            >
              <option value="none">None</option>
              <option value="fade-up">Fade up</option>
              <option value="fade-in">Fade in</option>
              <option value="slide-left">Slide from right</option>
              <option value="slide-right">Slide from left</option>
            </select>
          </Field>
          <Field label="Delay (ms)">
            <Input
              type="number"
              min="0"
              max="2000"
              value={String(p.revealDelay ?? "0")}
              onChange={(e) => update({ revealDelay: e.target.value })}
              className={inputCls}
            />
          </Field>
        </div>
      </div>
      <MediaLibraryDialog
        open={!!libraryKey}
        onOpenChange={(o) => !o && setLibraryKey(null)}
        current={libraryKey ? (p[libraryKey] as string) : undefined}
        onSelect={(u) => libraryKey && update({ [libraryKey]: u })}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[9px] font-semibold uppercase tracking-wider text-white/35">{label}</Label>
      {children}
    </div>
  );
}

function AlignPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1" role="group" aria-label="Alignment">
      {(["left", "center", "right"] as const).map((a) => (
        <button key={a} type="button" onClick={() => onChange(a)} aria-pressed={value === a} className={`flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] ${value === a ? "bg-[#FF0099] text-white" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"}`}>
          {a.charAt(0).toUpperCase() + a.slice(1)}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Pick color" className="h-7 w-7 rounded border border-white/10 bg-transparent cursor-pointer" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} aria-label="Color hex value" className="flex-1 bg-white/5 border-white/10 text-white text-xs h-7" />
    </div>
  );
}

function ToggleBtn({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className={`w-full rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] ${value ? "bg-[#FF0099] text-white" : "bg-white/5 text-white/40 border border-white/10"}`}
    >
      {value ? "Enabled" : "Disabled"}
    </button>
  );
}
