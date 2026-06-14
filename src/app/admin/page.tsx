"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useHasPermission } from "@/lib/use-roles-store";
import { useAuthHydrated } from "@/lib/use-auth-hydrated";
import { useCms } from "@/lib/cms-store";
import { useInlineEdit } from "@/lib/use-inline-edit";
import { PageManager } from "@/components/admin/page-manager";
import { NavEditor } from "@/components/admin/nav-editor";
import { NewsletterPanel } from "@/components/admin/newsletter-panel";
import { SiteSettingsPanel } from "@/components/admin/site-settings-panel";
import { ContentManager } from "@/components/admin/content-manager";
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
  Users,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Tab = "pages" | "nav" | "content" | "templates" | "audience" | "settings";

export default function AdminPage() {
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const router = useRouter();
  const hydrated = useAuthHydrated();
  // Access is the manageContent role permission (admins have it by
  // default; grantable to any role from Admin → Roles & permissions).
  const canEditContent = useHasPermission("manageContent");
  const allowed = canEditContent || user?.role === "admin";

  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [contentSection, setContentSection] = useState<
    "home" | "testimonials" | "experiences" | "gallery" | "faq" | "marquee"
  >("home");
  const templates = useCms((s) => s.templates);
  const deleteTemplate = useCms((s) => s.deleteTemplate);

  // Deep-link support: /admin?tab=content|settings|pages|… opens that tab.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && ["pages", "content", "nav", "settings", "templates", "audience"].includes(t)) {
      setActiveTab(t as Tab);
    }
  }, []);

  // The admin dashboard authors the SHARED CMS, so once the signed-in admin is
  // confirmed we subscribe to Firestore in realtime — pages/nav/templates
  // published from any browser appear here, and our writes flow back. Falls
  // back to localStorage when Firebase isn't configured. subscribe() returns
  // its ref-counted unsubscribe for cleanup.
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || !allowed) {
      router.replace("/login");
      return;
    }
    const unsubscribe = useCms.getState().subscribe();
    return unsubscribe;
  }, [hydrated, isAuthenticated, allowed, router]);

  const toggleEditMode = useEditMode((s) => s.toggleEditMode);

  function handleEditPage(slug: string) {
    // Each core page opens its *exact* editor — not a generic tab. Pages with
    // structured content (trips, events, gallery, FAQ) go to their managers;
    // text-heavy pages (camp, home) open the live page in click-to-edit mode.
    switch (slug) {
      case "trips":
        toast.info("Add, edit & reorder trips here.");
        router.push("/community/admin/trips");
        return;
      case "events":
      case "featured":
        toast.info("Manage events & the featured event here.");
        router.push("/community/admin/calendar");
        return;
      case "gallery":
        setContentSection("gallery");
        setActiveTab("content");
        return;
      case "faq":
        setContentSection("faq");
        setActiveTab("content");
        return;
      case "home":
        setContentSection("home");
        setActiveTab("content");
        return;
      case "camp":
        // Camp is pure narrative — open the live page in click-to-edit mode.
        useInlineEdit.getState().set(true);
        router.push("/camp");
        return;
      default:
        // Custom standalone pages use the block editor.
        toggleEditMode(slug);
        router.push(`/p/${slug}`);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A0814] text-white/60 text-sm">
        Loading...
      </div>
    );
  }
  if (!isAuthenticated || !allowed) return null;

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
            { id: "content" as Tab, icon: Sparkles, label: "Content" },
            { id: "nav" as Tab, icon: Navigation, label: "Nav" },
            { id: "settings" as Tab, icon: SettingsIcon, label: "Settings" },
            { id: "templates" as Tab, icon: LayoutTemplate, label: "Templates" },
            { id: "audience" as Tab, icon: Users, label: "Audience" },
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
      {activeTab === "settings" ? (
        <div className="flex-1 overflow-hidden">
          <SiteSettingsPanel />
        </div>
      ) : activeTab === "content" ? (
        <div className="flex-1 overflow-hidden">
          <ContentManager section={contentSection} />
        </div>
      ) : activeTab === "audience" ? (
        <div className="flex-1 overflow-hidden">
          <NewsletterPanel />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-8">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-[#FF0099]/15 to-[#B51760]/10 flex items-center justify-center mb-6">
              <FileText className="h-8 w-8 text-[#FF0099]/60" />
            </div>
            <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] text-white">
              Manage Your Site
            </h2>
            <p className="mt-3 text-sm text-white/40 leading-relaxed">
              To edit your site&apos;s <strong className="text-white/70">text, photos, FAQ,
              testimonials, hero headlines, gallery</strong> and more, use the{" "}
              <strong className="text-white/70">Content</strong> tab. For your{" "}
              <strong className="text-white/70">logo, announcement bar, contact info, and
              brand colors</strong>, use the <strong className="text-white/70">Settings</strong> tab.
              These mirror the live site and save instantly.
            </p>
            <p className="mt-4 text-xs text-white/25">
              The <strong className="text-white/40">Pages</strong> tab is only for building
              brand-new standalone pages — it doesn&apos;t edit the main marketing pages.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
