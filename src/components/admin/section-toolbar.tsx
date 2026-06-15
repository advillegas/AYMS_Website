"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditMode } from "@/lib/edit-mode";
import { useBuilder, type BuilderElement } from "@/lib/builder-store";
import { type CmsVersion, SYSTEM_PAGES, systemPageHref } from "@/lib/cms-store";
import { pageHasSections } from "@/lib/sections/registry";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Save,
  Upload,
  X,
  Plus,
  PanelLeft,
  RotateCcw,
  History,
  Undo2,
  AlertTriangle,
  Undo,
  Redo,
  Eye,
  ChevronDown,
} from "lucide-react";

interface Props {
  onAddSection: () => void;
  outlineOpen: boolean;
  onToggleOutline: () => void;
  onSave: () => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  slug: string;
  isSystem: boolean;
  onReset: () => void;
  onUnpublish: () => void;
  onListVersions: () => Promise<CmsVersion[]>;
  onRestoreVersion: (elements: BuilderElement[]) => void;
}

function formatWhen(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Top bar for the section page builder. */
export function SectionToolbar({
  onAddSection,
  outlineOpen,
  onToggleOutline,
  onSave,
  onPublish,
  slug,
  isSystem,
  onReset,
  onUnpublish,
  onListVersions,
  onRestoreVersion,
}: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const isEditMode = useEditMode((s) => s.isEditMode);
  const pageSlug = useEditMode((s) => s.pageSlug);
  const setEditPage = useEditMode((s) => s.setEditPage);
  const exitEditMode = useEditMode((s) => s.exitEditMode);
  const setPreview = useEditMode((s) => s.setPreview);
  const canUndo = useBuilder((s) => s.canUndo);
  const canRedo = useBuilder((s) => s.canRedo);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const editablePages = SYSTEM_PAGES.filter((p) => pageHasSections(p.slug));

  function goToPage(s: string) {
    setPagesOpen(false);
    if (s === pageSlug) return;
    setEditPage(s);
    router.push(systemPageHref(s));
  }
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

  async function handleReset() {
    setRevertOpen(false);
    const ok = await confirm({
      title: "Reset to the original design?",
      description:
        "This replaces what's on the canvas with the built-in AYMS sections. Publish afterward to update the live site.",
      confirmText: "Reset",
      destructive: true,
    });
    if (!ok) return;
    onReset();
    toast.success("Reset — the original page is restored.");
  }

  async function handleUnpublish() {
    setRevertOpen(false);
    const ok = await confirm({
      title: "Unpublish this page?",
      description:
        "Visitors will immediately see the original built-in page instead of your published version.",
      confirmText: "Unpublish",
      destructive: true,
    });
    if (!ok) return;
    onUnpublish();
    toast.success("Unpublished — the original page is live again.");
  }

  async function handleRestore(v: CmsVersion) {
    setRevertOpen(false);
    const ok = await confirm({
      title: "Restore this version?",
      description:
        "This makes the selected snapshot the live published page, replacing what's currently live.",
      confirmText: "Restore",
      destructive: true,
    });
    if (!ok) return;
    onRestoreVersion(v.elements);
    toast.success("Version restored and published.");
  }

  useEffect(() => {
    if (!isEditMode) return;
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
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
    <div className="fixed top-0 left-0 right-0 z-[100] flex h-10 items-center gap-3 border-b border-[#FF0099]/30 bg-[#2A0A1E] px-3 shadow-lg shadow-black/30">
      {/* Left: status + structure + undo/redo */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleOutline}
          aria-pressed={outlineOpen}
          title="Toggle page structure"
          className={`rounded-md p-1.5 transition-colors hover:bg-white/10 ${outlineOpen ? "text-[#FF0099]" : "text-white/50 hover:text-white"}`}
        >
          <PanelLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="hidden text-[11px] font-bold uppercase tracking-wider text-white/70 sm:inline">
          Editing
        </span>
        {/* Page switcher — jump between pages without leaving the builder */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setPagesOpen((v) => !v)}
            aria-expanded={pagesOpen}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/10"
            title="Switch page"
          >
            {SYSTEM_PAGES.find((p) => p.slug === pageSlug)?.title ?? pageSlug ?? "Page"}
            <ChevronDown className={`h-3 w-3 transition-transform ${pagesOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {pagesOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setPagesOpen(false)} />
              <div role="menu" className="absolute left-0 top-full z-20 mt-2 w-44 rounded-xl border border-white/10 bg-[#1a0f18] p-1.5 shadow-xl shadow-black/40">
                <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/30">Edit page</p>
                {editablePages.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => goToPage(p.slug)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-white/5 ${p.slug === pageSlug ? "text-[#FF0099]" : "text-white/70 hover:text-white"}`}
                  >
                    {p.title}
                    <span className="text-[10px] text-white/25">{p.href}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="ml-1 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => useBuilder.getState().undo()}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
          >
            <Undo className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => useBuilder.getState().redo()}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
          >
            <Redo className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Center: add section */}
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={onAddSection}
          className="flex items-center gap-1.5 rounded-lg border border-[#FF0099]/40 bg-[#FF0099]/10 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#FF0099]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          Add Section
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={openRevert}
            aria-expanded={revertOpen}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Undo2 className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Revert</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${revertOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {revertOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setRevertOpen(false)} />
              <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-[300px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-[#1a0f18] p-2 shadow-xl shadow-black/40">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF0099]" aria-hidden="true" />
                  <span>
                    <span className="block text-[11px] font-semibold">Reset to original design</span>
                    <span className="block text-[10px] text-white/40">Reload the built-in AYMS sections.</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleUnpublish}
                  className="flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF0099]" aria-hidden="true" />
                  <span>
                    <span className="block text-[11px] font-semibold">Unpublish this page</span>
                    <span className="block text-[10px] text-white/40">Hide your version; show the original.</span>
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
                          onClick={() => handleRestore(v)}
                          className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70 transition-colors hover:bg-[#FF0099]/15 hover:text-white"
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

        <Button onClick={() => setPreview(true)} variant="ghost" className="h-7 gap-1 px-2.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white">
          <Eye className="h-3 w-3" aria-hidden="true" />
          <span className="hidden sm:inline">Preview</span>
        </Button>
        <Button onClick={handleSave} disabled={saving} variant="ghost" className="h-7 gap-1 px-2.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50">
          <Save className="h-3 w-3" aria-hidden="true" />
          <span className="hidden sm:inline">{saving ? "Saving…" : "Save"}</span>
        </Button>
        <Button onClick={() => setConfirmPublish(true)} className="h-7 gap-1 border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-2.5 text-[11px] text-white hover:brightness-110">
          <Upload className="h-3 w-3" aria-hidden="true" />
          Publish
        </Button>
        <div className="mx-1 h-4 w-px bg-white/10" aria-hidden="true" />
        <Button onClick={exitEditMode} variant="ghost" className="h-7 px-2 text-[11px] text-white/40 hover:bg-white/10 hover:text-white">
          <X className="h-3 w-3" aria-hidden="true" />
          <span className="hidden sm:inline">Exit</span>
        </Button>
      </div>

      {confirmPublish && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmPublish(false)}>
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg text-[#221019]">Publish to the live site?</h2>
            <p className="mt-2 text-sm text-[#221019]/70">
              This replaces the <strong>{slug}</strong> page that <strong>everyone</strong> sees on the live website.
            </p>
            {isSystem && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#FF7F50]/30 bg-[#FF7F50]/10 p-2.5 text-[12px] text-[#9a3412]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>This is a <strong>core site page</strong>. If something looks off, use <strong>Revert → Reset to original</strong> or restore a version.</span>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmPublish(false)} disabled={publishing} className="rounded-full px-4 py-2 text-sm font-medium text-[#221019]/60 hover:bg-[#221019]/[0.05] disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={handlePublishConfirm} disabled={publishing} className="rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                {publishing ? "Publishing…" : "Publish now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
