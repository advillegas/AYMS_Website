"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConversationList } from "@/components/community/messages/conversation-list";
import { ConversationView } from "@/components/community/messages/conversation-view";
import { NewConversationDialog } from "@/components/community/messages/new-conversation-dialog";
import { FriendsPanel } from "@/components/community/messages/friends-panel";
import { useAuth } from "@/lib/store";
import { useConversations } from "@/lib/use-conversations";
import { useIncomingFriendRequestCount } from "@/lib/use-friends";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useSupabaseBackend } from "@/lib/supabase";
import { Loader2, MessageCircle, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Direct messages + group chats page.
 *
 * Layout: 2-column split inside the community shell's main area.
 *   - Left: conversation list + "New" button
 *   - Right: active conversation, or empty-state CTA
 *
 * The active conversation id lives in the `?c=` query param so deep
 * links from the profile mini-card survive a refresh and the back
 * button still works.
 */
type SidebarTab = "chats" | "friends";

interface SidebarTabsProps {
  tab: SidebarTab;
  onChange: (next: SidebarTab) => void;
  incomingRequests: number;
}

function SidebarTabs({ tab, onChange, incomingRequests }: SidebarTabsProps) {
  return (
    <div className="flex shrink-0 items-stretch border-b border-rosa/20 bg-card/60">
      <button
        type="button"
        onClick={() => onChange("chats")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors",
          tab === "chats"
            ? "text-primary border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Chats
      </button>
      <button
        type="button"
        onClick={() => onChange("friends")}
        className={cn(
          "relative flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors",
          tab === "friends"
            ? "text-primary border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
        )}
      >
        <Users className="h-3.5 w-3.5" />
        Friends
        {incomingRequests > 0 && (
          <span
            className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-coral text-white text-[9px] font-bold px-1"
            aria-label={`${incomingRequests} pending`}
          >
            {incomingRequests > 9 ? "9+" : incomingRequests}
          </span>
        )}
      </button>
    </div>
  );
}

function MessagesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuth((s) => s.user);
  const { conversations, loading } = useConversations();
  const incomingRequests = useIncomingFriendRequestCount();
  const [newOpen, setNewOpen] = useState(false);
  const [tab, setTab] = useState<SidebarTab>("chats");

  const activeId = searchParams.get("c");

  // Auto-flip to "Friends" when a new request comes in if the user
  // hasn't selected anything yet - subtle nudge without grabbing focus
  // away from an active chat.
  useEffect(() => {
    if (incomingRequests > 0 && !activeId && tab === "chats" && conversations.length === 0) {
      setTab("friends");
    }
  }, [incomingRequests, activeId, tab, conversations.length]);

  // (Browser notifications for new DMs are mounted globally in the
  // community shell so they fire across every /community page, not
  // just here.)

  // If the deep-linked conversation isn't accessible (e.g. left or
  // never existed) clear the query param so we don't get a stuck
  // empty state. Wait longer (5s) because newly-created group chats
  // may take a moment to appear in the onSnapshot subscription after
  // the server confirms the addDoc.
  useEffect(() => {
    if (!activeId || loading) return;
    const found = conversations.some((c) => c.id === activeId);
    if (!found && conversations.length > 0) {
      const t = setTimeout(() => {
        const stillMissing = !conversations.some((c) => c.id === activeId);
        if (stillMissing) {
          const sp = new URLSearchParams(searchParams.toString());
          sp.delete("c");
          router.replace(`/community/messages${sp.size ? `?${sp}` : ""}`);
        }
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [activeId, conversations, loading, router, searchParams]);

  // Local state mirror of the active conversation so clicking a row
  // is instant even when Next.js deduplicates the route push.
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  // Sync from URL on mount and when searchParams change externally.
  useEffect(() => {
    setLocalActiveId(activeId);
  }, [activeId]);

  function handleSelect(conversationId: string) {
    // Update local state immediately so the UI responds even if
    // router.push is deduplicated by Next.js.
    setLocalActiveId(conversationId);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("c", conversationId);
    router.push(`/community/messages?${sp.toString()}`);
  }

  // Use localActiveId for rendering so clicks are instant.
  const effectiveActiveId = localActiveId ?? activeId;

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Please sign in to use direct messages.
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <SidebarTabs
        tab={tab}
        onChange={setTab}
        incomingRequests={incomingRequests}
      />
      {tab === "chats" ? (
        <ConversationList
          activeId={effectiveActiveId}
          onSelect={handleSelect}
          onNewConversation={() => setNewOpen(true)}
        />
      ) : (
        <FriendsPanel />
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar: chats / friends tabs */}
      <aside className="w-72 shrink-0 border-r border-rosa/20 bg-card/40 hidden md:flex flex-col">
        {sidebar}
      </aside>

      {/* Mobile collapsed view: sidebar shows when no conversation is
          selected, the conversation view takes over once one is. */}
      <div
        className={`md:hidden h-full w-full ${effectiveActiveId ? "hidden" : "flex flex-col"}`}
      >
        {sidebar}
      </div>

      {/* Active conversation */}
      <main
        className={`flex-1 min-w-0 ${effectiveActiveId ? "block" : "hidden md:block"}`}
      >
        {!(isFirebaseConfigured || useSupabaseBackend) ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="max-w-sm space-y-2">
              <MessageCircle className="mx-auto h-10 w-10 text-primary/60" />
              <p className="text-sm font-semibold">
                Direct messages need a live backend
              </p>
              <p className="text-xs text-muted-foreground">
                Add the <code className="font-mono">NEXT_PUBLIC_FIREBASE_*</code>{" "}
                (or Supabase) env vars and reload to enable real-time DMs and
                group chats.
              </p>
            </div>
          </div>
        ) : (
          <ConversationView conversationId={effectiveActiveId} />
        )}
      </main>

      <NewConversationDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MessagesInner />
    </Suspense>
  );
}
