"use client";

import { useState } from "react";
import { useCms } from "@/lib/cms-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Edit3,
  Globe,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

const SYSTEM_PAGES = [
  { slug: "home", title: "Home", href: "/" },
  { slug: "trips", title: "Trips", href: "/trips" },
  { slug: "events", title: "Events", href: "/events" },
  { slug: "gallery", title: "Gallery", href: "/gallery" },
  { slug: "play", title: "Play", href: "/play" },
  { slug: "faq", title: "FAQ", href: "/faq" },
  { slug: "featured", title: "Featured Event", href: "/featured" },
];

interface Props {
  onEditPage: (slug: string) => void;
}

export function PageManager({ onEditPage }: Props) {
  const pages = useCms((s) => s.pages);
  const createPage = useCms((s) => s.createPage);
  const deletePage = useCms((s) => s.deletePage);
  const addNavLink = useCms((s) => s.addNavLink);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  function handleCreate() {
    if (!newTitle.trim() || !newSlug.trim()) return;
    const slug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    createPage(newTitle.trim(), slug);
    addNavLink(newTitle.trim(), `/p/${slug}`);
    setNewTitle("");
    setNewSlug("");
    setCreateOpen(false);
    onEditPage(slug);
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
          <Plus className="h-3.5 w-3.5 mr-1" /> New Page
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
                <Lock className="h-3.5 w-3.5 text-white/20 shrink-0" />
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
                    <FileText className="h-3.5 w-3.5 text-[#FF0099]/60 shrink-0" />
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
                        <Eye className="h-2.5 w-2.5 mr-0.5" /> Live
                      </Badge>
                    ) : (
                      <Badge className="bg-white/5 text-white/30 border-white/10 text-[9px]">
                        <EyeOff className="h-2.5 w-2.5 mr-0.5" /> Draft
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(page.slug);
                      }}
                      className="h-6 w-6 text-white/20 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Title</label>
              <Input
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-"));
                }}
                placeholder="My New Page"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL Slug</label>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>/p/</span>
                <Input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="my-new-page"
                  className="flex-1"
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || !newSlug.trim()} className="w-full bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0">
              Create Page
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
