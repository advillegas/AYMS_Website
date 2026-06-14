"use client";

import { useState } from "react";
import { useCms, SYSTEM_PAGES } from "@/lib/cms-store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  Trash2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface Props {
  onEditPage: (slug: string) => void;
}

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function PageManager({ onEditPage }: Props) {
  const pages = useCms((s) => s.pages);
  const createPage = useCms((s) => s.createPage);
  const deletePage = useCms((s) => s.deletePage);
  const addNavLink = useCms((s) => s.addNavLink);
  const confirm = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalSlug = sanitizeSlug(newSlug);
  const reservedSlugs = new Set(SYSTEM_PAGES.map((p) => p.slug));
  const slugTaken =
    !!finalSlug && (reservedSlugs.has(finalSlug) || !!pages[finalSlug]);
  const canCreate = !!newTitle.trim() && !!finalSlug && !slugTaken;

  function resetCreateForm() {
    setNewTitle("");
    setNewSlug("");
    setSlugTouched(false);
    setError(null);
  }

  function handleCreate() {
    if (!newTitle.trim()) {
      setError("Please enter a page title.");
      return;
    }
    if (!finalSlug) {
      setError("Please enter a URL slug (letters, numbers, hyphens).");
      return;
    }
    if (slugTaken) {
      setError(`The slug “/${finalSlug}” is already in use. Choose another.`);
      return;
    }
    createPage(newTitle.trim(), finalSlug);
    addNavLink(newTitle.trim(), `/p/${finalSlug}`);
    resetCreateForm();
    setCreateOpen(false);
    toast.success(`Page “${newTitle.trim()}” created`);
    onEditPage(finalSlug);
  }

  async function handleDelete(slug: string, title: string) {
    const ok = await confirm({
      title: `Delete “${title}”?`,
      description:
        "This permanently removes the page and its navigation link. This cannot be undone.",
      confirmText: "Delete page",
      destructive: true,
    });
    if (!ok) return;
    deletePage(slug);
    toast.success(`Page “${title}” deleted`);
  }

  const customPages = Object.values(pages).filter((p) => !p.isSystem);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-sm font-bold text-white">Pages</h2>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 text-xs h-8 px-3"
        >
          <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> New Page
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 px-2 mb-1">
            System Pages
          </p>
          {SYSTEM_PAGES.map((sp) => {
            const cmsPage = pages[sp.slug];
            const hasOverride = cmsPage && cmsPage.elements.length > 0;
            return (
              <button
                key={sp.slug}
                onClick={() => onEditPage(sp.slug)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 group"
              >
                <Lock className="h-3.5 w-3.5 text-white/20 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 group-hover:text-white truncate">
                    {sp.title}
                  </p>
                  <p className="text-[10px] text-white/30">{sp.href}</p>
                </div>
                {hasOverride && (
                  <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[9px]">
                    Edited
                  </Badge>
                )}
              </button>
            );
          })}

          {customPages.length > 0 && (
            <>
              <Separator className="bg-white/10 my-3" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 px-2 mb-1">
                Custom Pages
              </p>
              {customPages.map((page) => (
                <div
                  key={page.slug}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-white/5 group"
                >
                  <button
                    onClick={() => onEditPage(page.slug)}
                    className="flex flex-1 items-center gap-3 text-left min-w-0"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#FF0099]/60 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/80 group-hover:text-white truncate">
                        {page.title}
                      </p>
                      <p className="text-[10px] text-white/30">/p/{page.slug}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {page.isPublished ? (
                      <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[9px]">
                        <Eye className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" /> Live
                      </Badge>
                    ) : (
                      <Badge className="bg-white/5 text-white/30 border-white/10 text-[9px]">
                        <EyeOff className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" /> Draft
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete page ${page.title}`}
                      title={`Delete page ${page.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(page.slug, page.title);
                      }}
                      className="h-6 w-6 text-white/20 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="new-page-title" className="text-sm font-medium">
                Page Title
              </label>
              <Input
                id="new-page-title"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  setError(null);
                  // Auto-fill the slug from the title until the user edits it manually.
                  if (!slugTouched) {
                    setNewSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, "")
                        .replace(/\s+/g, "-"),
                    );
                  }
                }}
                placeholder="My New Page"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-page-slug" className="text-sm font-medium">
                URL Slug
              </label>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>/p/</span>
                <Input
                  id="new-page-slug"
                  value={newSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setNewSlug(e.target.value);
                    setError(null);
                  }}
                  placeholder="my-new-page"
                  aria-invalid={slugTaken || undefined}
                  className="flex-1"
                />
              </div>
              {finalSlug && !slugTaken && (
                <p className="text-[11px] text-white/40">
                  Page will live at <span className="text-white/60">/p/{finalSlug}</span>
                </p>
              )}
              {slugTaken && (
                <p className="text-[11px] text-red-400">
                  “/{finalSlug}” is already in use. Pick a different slug.
                </p>
              )}
            </div>
            {error && (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={!canCreate}
              className="w-full bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0"
            >
              Create Page
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
