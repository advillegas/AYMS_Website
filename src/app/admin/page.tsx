"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { useHasPermission } from "@/lib/use-roles-store";
import { useAuthHydrated } from "@/lib/use-auth-hydrated";
import { useCms, systemPageHref } from "@/lib/cms-store";
import { useInlineEdit } from "@/lib/use-inline-edit";
import { pageHasSections } from "@/lib/sections/registry";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { PageManager } from "@/components/admin/page-manager";
import { NavEditor } from "@/components/admin/nav-editor";
import { NewsletterPanel } from "@/components/admin/newsletter-panel";
import { SiteSettingsPanel } from "@/components/admin/site-settings-panel";
import { ContentManager } from "@/components/admin/content-manager";
import { SeoPanel } from "@/components/admin/seo-panel";
import { TripsPanel } from "@/components/admin/trips-panel";
import { EventsPanel } from "@/components/admin/events-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditMode } from "@/lib/edit-mode";
import {
  FileText,
  Navigation,
  LayoutTemplate,
  Home,
  Trash2,
  Users,
  Settings as SettingsIcon,
  Sparkles,
  Search,
  Plane,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Tab = "pages" | "nav" | "content" | "trips" | "events" | "templates" | "audience" | "settings" | "seo";

const VALID_TABS: Tab[] = ["pages", "content", "trips", "events", "nav", "settings", "templates", "audience", "seo"];

interface NavItem {
  id: Tab;
  icon: React.ElementType;
  label: string;
  desc: string;
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Pages",
    items: [
      { id: "pages", icon: FileText, label: "Pages", desc: "Edit & build pages" },
    ],
  },
  {
    group: "Content",
    items: [
      { id: "content", icon: Sparkles, label: "Content", desc: "Text, photos & lists" },
      { id: "trips", icon: Plane, label: "Trips", desc: "Trip listings" },
      { id: "events", icon: CalendarDays, label: "Events", desc: "Calendar & events" },
    ],
  },
  {
    group: "Setup",
    items: [
      { id: "settings", icon: SettingsIcon, label: "Settings", desc: "Brand, logo & contact" },
      { id: "seo", icon: Search, label: "SEO", desc: "Search & social previews" },
      { id: "nav", icon: Navigation, label: "Navigation", desc: "Menu links & order" },
      { id: "templates", icon: LayoutTemplate, label: "Templates", desc: "Saved blocks" },
    ],
  },
  {
    group: "Grow",
    items: [
      { id: "audience", icon: Users, label: "Audience", desc: "Newsletter signups" },
    ],
  },
];

export default function AdminPage() {
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const canEditContent = useHasPermission("manageContent");
  const allowed = canEditContent || user?.role === "admin";

  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [contentSection, setContentSection] = useState<
    "home" | "testimonials" | "experiences" | "gallery" | "faq" | "marquee"
  >("home");
  const templates = useCms((s) => s.templates);
  const deleteTemplate = useCms((s) => s.deleteTemplate);
  const confirm = useConfirm();

  async function handleDeleteTemplate(id: string, name: string) {
    const ok = await confirm({
      title: `Delete template “${name}”?`,
      description: "This permanently removes the saved template. This cannot be undone.",
      confirmText: "Delete template",
      destructive: true,
    });
    if (!ok) return;
    deleteTemplate(id);
    toast.success(`Template “${name}” deleted`);
  }

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && VALID_TABS.includes(t as Tab)) setActiveTab(t as Tab);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated || !allowed) {
      router.replace("/login");
      return;
    }
    const unsubscribe = useCms.getState().subscribe();
    return unsubscribe;
  }, [hydrated, isAuthenticated, allowed, router]);

  const setEditPage = useEditMode((s) => s.setEditPage);

  function handleEditPage(slug: string) {
    if (pageHasSections(slug)) {
      setEditPage(slug);
      router.push(systemPageHref(slug));
      return;
    }
    switch (slug) {
      case "trips":
        setActiveTab("trips");
        return;
      case "events":
      case "featured":
        setActiveTab("events");
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
        useInlineEdit.getState().set(true);
        router.push("/camp");
        return;
      default:
        setEditPage(slug);
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

  const activeLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label ?? "";

  return (
    <div className="dark flex h-screen overflow-hidden bg-[#1A0814] text-white">
      {/* Sidebar — vertical nav rail */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#2A0A1E]">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <Image src="/ayms-logo.svg" alt="AYMS" width={28} height={28} className="rounded-full" />
          <span className="font-[family-name:var(--font-heading)] text-sm font-bold">Admin</span>
        </div>

        <ScrollArea className="flex-1">
          <nav className="space-y-3 p-2" aria-label="Admin sections">
            {NAV_GROUPS.map((group) => (
              <div key={group.group}>
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-white/25">
                  {group.group}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        aria-current={active ? "page" : undefined}
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                          active ? "bg-[#FF0099]/15 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            active ? "bg-gradient-to-br from-[#FF0099] to-[#B51760] text-white" : "bg-white/5 text-white/50 group-hover:text-white"
                          }`}
                        >
                          <item.icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-tight">{item.label}</span>
                          <span className="block truncate text-[11px] text-white/35">{item.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Home className="h-3.5 w-3.5" /> Back to site
            <ExternalLink className="ml-auto h-3 w-3 text-white/25" aria-hidden="true" />
          </Link>
        </div>
      </aside>

      {/* Main content area — one panel per nav item */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-label={activeLabel}>
        {activeTab === "pages" && <PageManager onEditPage={handleEditPage} />}
        {activeTab === "content" && <ContentManager section={contentSection} />}
        {activeTab === "trips" && <TripsPanel />}
        {activeTab === "events" && <EventsPanel />}
        {activeTab === "settings" && <SiteSettingsPanel />}
        {activeTab === "seo" && <SeoPanel />}
        {activeTab === "nav" && <NavEditor />}
        {activeTab === "audience" && <NewsletterPanel />}
        {activeTab === "templates" && (
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center border-b border-white/10 px-6">
              <div>
                <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">Saved Templates</h2>
                <p className="text-[11px] text-white/40">Reusable blocks you&apos;ve saved from the builder.</p>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-2xl space-y-1.5 p-6">
                {templates.length === 0 ? (
                  <p className="py-12 text-center text-sm text-white/25">
                    No templates saved yet. Save a block layout from the page builder to reuse it here.
                  </p>
                ) : (
                  templates.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-white/70">{t.name}</p>
                        <p className="text-[10px] text-white/30">{t.elements.length} elements</p>
                      </div>
                      <button
                        onClick={() => void handleDeleteTemplate(t.id, t.name)}
                        aria-label={`Delete template ${t.name}`}
                        className="p-1 text-white/20 transition-colors hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </main>
    </div>
  );
}
