"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { useAuthHydrated } from "@/lib/use-auth-hydrated";
import { useCms } from "@/lib/cms-store";
import { PageManager } from "@/components/admin/page-manager";
import { NavEditor } from "@/components/admin/nav-editor";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useEditMode } from "@/lib/edit-mode";
import {
  FileText,
  Navigation,
  LayoutTemplate,
  Home,
  Trash2,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Tab = "pages" | "nav" | "templates";

export default function AdminPage() {
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const router = useRouter();
  const hydrated = useAuthHydrated();

  const [activeTab, setActiveTab] = useState<Tab>("pages");
  const cmsLoad = useCms((s) => s.loadFromStorage);
  const templates = useCms((s) => s.templates);
  const deleteTemplate = useCms((s) => s.deleteTemplate);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || user?.role !== "admin") {
      router.replace("/login");
      return;
    }
    cmsLoad();
  }, [hydrated, isAuthenticated, user, router, cmsLoad]);

  const toggleEditMode = useEditMode((s) => s.toggleEditMode);

  function handleEditPage(slug: string) {
    const systemMap: Record<string, string> = {
      home: "/", trips: "/trips", events: "/events", gallery: "/gallery",
      play: "/play", faq: "/faq", featured: "/featured",
    };
    const href = systemMap[slug] || `/p/${slug}`;
    toggleEditMode(slug);
    router.push(href);
  }

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A0814] text-white/60 text-sm">
        Loading...
      </div>
    );
  }
  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="flex h-screen bg-[#1A0814] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#2A0A1E]">
        <div className="flex h-14 items-center gap-2 px-4 border-b border-white/10">
          <Image src="/ayms-logo.svg" alt="AYMS" width={28} height={28} className="rounded-full" />
          <span className="text-sm font-bold font-[family-name:var(--font-heading)]">Admin Dashboard</span>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/10">
          {([
            { id: "pages" as Tab, icon: FileText, label: "Pages" },
            { id: "nav" as Tab, icon: Navigation, label: "Nav" },
            { id: "templates" as Tab, icon: LayoutTemplate, label: "Templates" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-[#FF0099] text-[#FF0099]"
                  : "border-transparent text-white/30 hover:text-white/60"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "pages" && <PageManager onEditPage={handleEditPage} />}
          {activeTab === "nav" && <NavEditor />}
          {activeTab === "templates" && (
            <ScrollArea className="h-full p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2 px-1">
                Saved Templates
              </p>
              {templates.length === 0 ? (
                <p className="text-xs text-white/20 text-center py-8">No templates saved yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {templates.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-white/70">{t.name}</p>
                        <p className="text-[10px] text-white/30">{t.elements.length} elements</p>
                      </div>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="p-1 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        <Separator className="bg-white/10" />
        <div className="p-3">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <Home className="h-3.5 w-3.5" /> Back to Site
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-[#FF0099]/15 to-[#B51760]/10 flex items-center justify-center mb-6">
            <FileText className="h-8 w-8 text-[#FF0099]/60" />
          </div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] text-white">
            Manage Your Site
          </h2>
          <p className="mt-3 text-sm text-white/40 leading-relaxed">
            Use the sidebar to manage pages, navigation, and templates.
            To edit a page&apos;s content, click on it in the Pages list —
            you&apos;ll be taken to the live page with inline editing enabled.
          </p>
          <p className="mt-4 text-xs text-white/25">
            You can also click &quot;Edit This Page&quot; on any page while browsing the site.
          </p>
        </div>
      </div>
    </div>
  );
}
