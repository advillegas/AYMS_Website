"use client";

import { useState, useEffect } from "react";
import { useEditMode } from "@/lib/edit-mode";
import { useBuilder, type ElementType, type BuilderElement } from "@/lib/builder-store";
import { useCms, type CmsVersion } from "@/lib/cms-store";
import { useTogglePublish, TOGGLE_PUBLISH_HINT } from "@/lib/use-toggle-publish";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Save,
  Upload,
  X,
  Plus,
  Heading,
  Type,
  ImageIcon,
  Video,
  MousePointer,
  ArrowUpDown,
  Minus,
  CreditCard,
  LayoutTemplate,
  ChevronDown,
  Star,
  Grid3X3,
  Plane,
  CalendarDays,
  DollarSign,
  Timer,
  Columns2,
  Megaphone,
  HelpCircle,
  Sparkles,
  RotateCcw,
  History,
  Undo2,
  AlertTriangle,
  Undo,
  Redo,
  Eye,
} from "lucide-react";

interface PaletteItem { type: ElementType; icon: React.ElementType; label: string }
interface PaletteCategory { name: string; items: PaletteItem[] }

const PALETTE: PaletteCategory[] = [
  {
    name: "Content",
    items: [
      { type: "heading", icon: Heading, label: "Heading" },
      { type: "text", icon: Type, label: "Text" },
      { type: "image", icon: ImageIcon, label: "Image / GIF" },
      { type: "video", icon: Video, label: "Video" },
      { type: "button", icon: MousePointer, label: "Button" },
      { type: "card", icon: CreditCard, label: "Card" },
      { type: "hero", icon: Star, label: "Hero" },
      { type: "testimonial", icon: Sparkles, label: "Testimonial" },
      { type: "gallery", icon: Grid3X3, label: "Gallery" },
    ],
  },
  {
    name: "Trips & Events",
    items: [
      { type: "trip-card", icon: Plane, label: "Trip Card" },
      { type: "event-card", icon: CalendarDays, label: "Event Card" },
      { type: "pricing", icon: DollarSign, label: "Pricing" },
      { type: "countdown", icon: Timer, label: "Countdown" },
    ],
  },
  {
    name: "Layout",
    items: [
      { type: "section", icon: LayoutTemplate, label: "Section" },
      { type: "columns-2", icon: Columns2, label: "2 Columns" },
      { type: "spacer", icon: ArrowUpDown, label: "Spacer" },
      { type: "divider", icon: Minus, label: "Divider" },
      { type: "banner", icon: Megaphone, label: "Banner" },
    ],
  },
  {
    name: "Interactive",
    items: [
      { type: "faq-item", icon: HelpCircle, label: "FAQ Item" },
      { type: "cta-block", icon: Sparkles, label: "CTA Block" },
    ],
  },
];

interface Props {
  onAddElement: (type: ElementType) => void;
  onSave: () => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  slug: string;
  isSystem: boolean;
  onReset: () => void;
  onUnpublish: () => Promise<boolean>;
  onListVersions: () => Promise<CmsVersion[]>;
  onRestoreVersion: (elements: BuilderElement[]) => void;
}

function formatWhen(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminToolbar({
  onAddElement,
  onSave,
  onPublish,
  slug,
  isSystem,
  onReset,
  onUnpublish,
  onListVersions,
  onRestoreVersion,
}: Props) {
  const isEditMode = useEditMode((s) => s.isEditMode);
  const pageSlug = useEditMode((s) => s.pageSlug);
  const exitEditMode = useEditMode((s) => s.exitEditMode);
  const setPreview = useEditMode((s) => s.setPreview);
  const canUndo = useBuilder((s) => s.canUndo);
  const canRedo = useBuilder((s) => s.canRedo);
  const isLive = useCms((s) => !!s.pages[slug]?.isPublished);
  const { toggling: statusToggling, toggle: togglePublish } = useTogglePublish(slug);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) = redo, while editing.
  useEffect(() => {
    if (!isEditMode) return;
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      // Inside a contentEditable (rich text editing) the browser's native
      // undo owns Ctrl+Z — don't hijack it for canvas time-travel.
      if (target?.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        useBuilder.getState().undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        useBuilder.getState().redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEditMode]);
  const [revertOpen, setRevertOpen] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [versions, setVersions] = useState<CmsVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  async function handleSave() {
    setSaving(true);
    const ok = await onSave();
    setSaving(false);
    if (ok) toast.success("Saved as draft (not live yet).");
    else toast.error("Couldn't save — check your connection and try again.");
  }

  async function handlePublishConfirm() {
    setPublishing(true);
    const ok = await onPublish();
    setPublishing(false);
    setConfirmPublish(false);
    if (ok) toast.success("Published to the live site!");
    else toast.error("Couldn't save — check your connection and try again.");
  }

  async function openRevert() {
    const next = !revertOpen;
    setRevertOpen(next);
    if (next) {
      setVersionsLoading(true);
      try {
        setVersions(await onListVersions());
      } catch {
        setVersions([]);
      } finally {
        setVersionsLoading(false);
      }
    }
  }

  if (!isEditMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-10 bg-[#2A0A1E] border-b border-[#FF0099]/30 flex items-center px-4 gap-3 shadow-lg shadow-black/30">
      {/* Left: status */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
          Edit Mode
        </span>
        {pageSlug && (
          <span className="text-[10px] text-white/30 ml-1">
            / {pageSlug}
          </span>
        )}
        <button
          type="button"
          onDoubleClick={() => void togglePublish()}
          disabled={statusToggling}
          title={TOGGLE_PUBLISH_HINT}
          aria-label={`This page is ${isLive ? "live" : "in draft"}. ${TOGGLE_PUBLISH_HINT}.`}
          className={`ml-1 inline-flex h-5 select-none items-center gap-1 rounded-full border px-2 text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] disabled:opacity-50 ${
            isLive
              ? "border-green-500/25 bg-green-500/15 text-green-300 hover:bg-green-500/25"
              : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-green-400" : "bg-white/30"}`}
            aria-hidden="true"
          />
          {isLive ? "Live" : "Draft"}
        </button>
        <div className="ml-2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => useBuilder.getState().undo()}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
          >
            <Undo className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => useBuilder.getState().redo()}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
          >
            <Redo className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Center: add elements dropdown */}
      <div className="flex-1 flex justify-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPaletteOpen(!paletteOpen)}
            aria-expanded={paletteOpen}
            aria-haspopup="menu"
            className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Add Element
            <ChevronDown className={`h-3 w-3 transition-transform ${paletteOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {paletteOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setPaletteOpen(false)} />
              <div
                role="menu"
                aria-label="Add element"
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 rounded-xl bg-[#1a0f18] border border-white/10 p-3 shadow-xl shadow-black/40 w-[340px] max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto space-y-3"
              >
                {PALETTE.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-1.5 px-1">{cat.name}</p>
                    <div className="grid grid-cols-3 gap-1">
                      {cat.items.map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          role="menuitem"
                          aria-label={`Add ${item.label}`}
                          onClick={() => {
                            onAddElement(item.type);
                            setPaletteOpen(false);
                          }}
                          className="flex flex-col items-center gap-1 rounded-lg p-2.5 text-white/50 hover:bg-[#FF0099]/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                        >
                          <item.icon className="h-4 w-4" aria-hidden="true" />
                          <span className="text-[9px] font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Revert / safety menu */}
        <div className="relative">
          <button
            type="button"
            onClick={openRevert}
            aria-expanded={revertOpen}
            aria-haspopup="menu"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
          >
            <Undo2 className="h-3 w-3" aria-hidden="true" />
            Revert
            <ChevronDown className={`h-3 w-3 transition-transform ${revertOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {revertOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setRevertOpen(false)} />
              <div
                role="menu"
                aria-label="Revert options"
                className="absolute top-full right-0 mt-2 z-20 w-[300px] max-w-[calc(100vw-1.5rem)] rounded-xl bg-[#1a0f18] border border-white/10 p-2 shadow-xl shadow-black/40"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { onReset(); setRevertOpen(false); toast.success("Reset — the original page is restored live."); }}
                  className="flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left text-white/70 hover:bg-white/5 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                >
                  <RotateCcw className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#FF0099]" aria-hidden="true" />
                  <span>
                    <span className="block text-[11px] font-semibold">Reset to original design</span>
                    <span className="block text-[10px] text-white/40">Reload the built-in AYMS layout into the editor.</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setRevertOpen(false);
                    const ok = await onUnpublish();
                    if (ok) toast.success("Unpublished — the original site page is live again.");
                    else toast.error("Couldn't unpublish — check your connection and try again.");
                  }}
                  className="flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left text-white/70 hover:bg-white/5 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                >
                  <X className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#FF0099]" aria-hidden="true" />
                  <span>
                    <span className="block text-[11px] font-semibold">Unpublish this page</span>
                    <span className="block text-[10px] text-white/40">Hide your version; show the original live page.</span>
                  </span>
                </button>

                <div className="my-1.5 flex items-center gap-1.5 px-2.5 text-[9px] font-bold uppercase tracking-wider text-white/30">
                  <History className="h-3 w-3" aria-hidden="true" /> Version history
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {versionsLoading ? (
                    <p className="px-2.5 py-2 text-[10px] text-white/30">Loading…</p>
                  ) : versions.length === 0 ? (
                    <p className="px-2.5 py-2 text-[10px] text-white/30">No saved versions yet. Each publish saves one.</p>
                  ) : (
                    versions.map((v, i) => (
                      <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/5">
                        <span className="text-[10px] text-white/60">
                          {formatWhen(v.createdAt)}
                          {i === 0 && <span className="ml-1.5 text-[9px] text-[#FF0099]">current</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => { onRestoreVersion(v.elements); setRevertOpen(false); toast.success("Version restored and published."); }}
                          className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70 hover:bg-[#FF0099]/15 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                        >
                          Restore
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <Button
          onClick={() => setPreview(true)}
          variant="ghost"
          className="h-7 px-2.5 text-[11px] text-white/60 hover:text-white hover:bg-white/10 gap-1"
        >
          <Eye className="h-3 w-3" aria-hidden="true" />
          Preview
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="ghost"
          className="h-7 px-2.5 text-[11px] text-white/60 hover:text-white hover:bg-white/10 gap-1 disabled:opacity-50"
        >
          <Save className="h-3 w-3" aria-hidden="true" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          onClick={() => setConfirmPublish(true)}
          className="h-7 px-2.5 text-[11px] bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 hover:brightness-110 gap-1"
        >
          <Upload className="h-3 w-3" aria-hidden="true" />
          Publish
        </Button>
        <div className="w-px h-4 bg-white/10 mx-1" aria-hidden="true" />
        <Button
          onClick={exitEditMode}
          variant="ghost"
          className="h-7 px-2 text-[11px] text-white/40 hover:text-white hover:bg-white/10"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Exit
        </Button>
      </div>

      {/* Publish confirmation */}
      {confirmPublish && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmPublish(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="publish-confirm-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="publish-confirm-title" className="font-display text-lg text-[#221019]">
              Publish to the live site?
            </h2>
            <p className="mt-2 text-sm text-[#221019]/70">
              This replaces the <strong>{slug}</strong> page that <strong>everyone</strong> sees on the live website.
            </p>
            {isSystem && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#FF7F50]/30 bg-[#FF7F50]/10 p-2.5 text-[12px] text-[#9a3412]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>This is a <strong>core site page</strong>. If something looks off after publishing, use <strong>Revert → Reset to original</strong> or restore a previous version.</span>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPublish(false)}
                disabled={publishing}
                className="rounded-full px-4 py-2 text-sm font-medium text-[#221019]/60 hover:bg-[#221019]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishConfirm}
                disabled={publishing}
                className="rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-5 py-2 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] disabled:opacity-60"
              >
                {publishing ? "Publishing…" : "Publish now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
