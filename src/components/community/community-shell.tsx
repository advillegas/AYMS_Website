"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useChat } from "@/lib/store";
import { useCommunityUI } from "@/lib/community-ui-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Hash,
  Calendar,
  Users,
  User,
  LogOut,
  MessageSquare,
  MessageCircle,
  Menu,
  X,
  ChevronDown,
  Home,
  BellOff,
  AtSign,
  Mic,
  Video,
  Lock,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MembersPanel, MemberDetailCard } from "./members-panel";
import { ThreadPanel } from "./thread-panel";
import { useNotificationPrefs } from "@/lib/use-channel-notifications";
import {
  useChannels,
  useVisibleChannels,
  useChannelsSync,
  type RichChannel,
} from "@/lib/use-channels-store";
import { useMe, useHasPermission, useRolesSync } from "@/lib/use-roles-store";
import { ChannelDialog } from "./channel-dialog";
import { NotificationsButton } from "./notifications-button";
import {
  useContextMenu,
  type ContextMenuItem,
} from "./context-menu";
import { usePresenceHeartbeat, useMyStatus } from "@/lib/use-presence";
import { useGeoLocation } from "@/lib/geo";
import { usePrimeCommunityMembers } from "@/lib/use-community-members";
import { useDMNotifications } from "@/lib/use-dm-notifications";
import { useSearchParams } from "next/navigation";
import { AvatarStatusOverlay } from "./status-indicator";
import { StatusMenuItems } from "./status-menu";
import { useUnreadConversations } from "@/lib/use-conversations";
import { CommunityErrorBoundary } from "./community-error-boundary";

const BASE_TABS = [
  { label: "Chat", href: "/community", icon: MessageSquare, perm: null },
  { label: "Messages", href: "/community/messages", icon: MessageCircle, perm: null },
  { label: "Calendar", href: "/community/calendar", icon: Calendar, perm: null },
  { label: "Members", href: "/community/members", icon: Users, perm: null },
  { label: "Profile", href: "/community/profile", icon: User, perm: null },
] as const;

const ADMIN_TAB = {
  label: "Admin",
  href: "/community/admin",
  icon: Shield,
  perm: "viewAdminPanel" as const,
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  local: "Local",
  trips: "Trips & Travel",
  events: "Events",
  fun: "Fun & Lifestyle",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ChannelSidebarProps {
  onChannelClick?: () => void;
}

interface ChannelRowProps {
  ch: RichChannel;
  active: boolean;
  muted: boolean;
  onlyMentions: boolean;
  canManage: boolean;
  canReorder: boolean;
  setNotifyLevel: (
    id: string,
    level: "all" | "mentions" | "none",
  ) => void;
  onPick: (id: string) => void;
  onEdit: (ch: RichChannel) => void;
  onDelete: (ch: RichChannel) => void;
  /** Drag handlers wired by the parent so cross-channel drops work. */
  onDragStart: (e: React.DragEvent, ch: RichChannel) => void;
  onDragOver: (e: React.DragEvent, ch: RichChannel) => void;
  onDrop: (e: React.DragEvent, ch: RichChannel) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}

/**
 * Single row in the channel sidebar. Owns its own right-click context
 * menu so each row's items reflect ITS channel (not whichever channel
 * the user happened to right-click last).
 */
function ChannelRow({
  ch,
  active,
  muted,
  onlyMentions,
  canManage,
  canReorder,
  setNotifyLevel,
  onPick,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: ChannelRowProps) {
  const TypeIcon =
    ch.type === "voice" ? Mic : ch.type === "video" ? Video : Hash;
  const restricted = ch.restrictedRoleIds.length > 0;

  const ctx = useContextMenu(() => {
    const items: ContextMenuItem[] = [
      { kind: "label", label: `#${ch.name}` },
      {
        id: "mark-read",
        label: "Mark as read",
        onSelect: () => onPick(ch.id),
      },
      { kind: "separator" },
      {
        id: "notify-all",
        label: "Notifications: All",
        onSelect: () => setNotifyLevel(ch.id, "all"),
      },
      {
        id: "notify-mentions",
        label: "Notifications: @mentions only",
        onSelect: () => setNotifyLevel(ch.id, "mentions"),
      },
      {
        id: "notify-none",
        label: muted ? "Unmute channel" : "Mute channel",
        icon: <BellOff className="h-3.5 w-3.5" />,
        onSelect: () =>
          setNotifyLevel(ch.id, muted ? "all" : "none"),
      },
      { kind: "separator" },
      {
        id: "copy-link",
        label: "Copy channel link",
        icon: <Copy className="h-3.5 w-3.5" />,
        onSelect: () => {
          const url = `${window.location.origin}/community#ch-${ch.id}`;
          void navigator.clipboard.writeText(url);
          toast.success("Channel link copied.");
        },
      },
      {
        id: "copy-id",
        label: "Copy channel ID",
        icon: <Copy className="h-3.5 w-3.5" />,
        onSelect: () => {
          void navigator.clipboard.writeText(ch.id);
          toast.success("Channel ID copied.");
        },
      },
    ];
    if (canManage) {
      items.push({ kind: "separator" });
      items.push({
        id: "edit",
        label: "Edit channel",
        icon: <Pencil className="h-3.5 w-3.5" />,
        onSelect: () => onEdit(ch),
      });
      items.push({
        id: "delete",
        label: "Delete channel",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        danger: true,
        onSelect: () => onDelete(ch),
      });
    }
    return items;
  });

  return (
    <>
      {ctx.menu}
      <div
        draggable={canReorder}
        onDragStart={(e) => onDragStart(e, ch)}
        onDragOver={(e) => onDragOver(e, ch)}
        onDrop={(e) => onDrop(e, ch)}
        onDragEnd={onDragEnd}
        onContextMenu={ctx.openAt}
        className={cn(
          "group/ch relative flex items-center rounded-lg transition-colors",
          isDragOver && "ring-2 ring-primary/40",
        )}
      >
        <button
          onClick={() => onPick(ch.id)}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left transition-colors min-w-0",
            active
              ? "bg-primary/15 text-primary font-semibold"
              : "text-foreground/70 hover:bg-primary/8 hover:text-primary",
            muted && !active && "opacity-60",
          )}
          title={
            muted
              ? "Muted"
              : onlyMentions
                ? "Only @mentions"
                : restricted
                  ? "Role-restricted"
                  : undefined
          }
        >
          <TypeIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate flex-1">{ch.name}</span>
          {restricted && (
            <Lock className="h-2.5 w-2.5 shrink-0 opacity-50" />
          )}
          {muted ? (
            <BellOff className="h-3 w-3 shrink-0 opacity-70" />
          ) : null}
        </button>
        {canManage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(ch);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/ch:flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
            aria-label="Edit channel"
            title="Edit channel"
          >
            <Settings className="h-3 w-3" />
          </button>
        )}
      </div>
    </>
  );
}

function ChannelSidebar({ onChannelClick }: ChannelSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const channels = useVisibleChannels(user?.id);
  const moveChannelTo = useChannels((s) => s.moveChannelTo);
  const deleteChannel = useChannels((s) => s.deleteChannel);
  const activeChannel = useChat((s) => s.activeChannel);
  const setActiveChannel = useChat((s) => s.setActiveChannel);
  const closeThread = useCommunityUI((s) => s.closeThread);
  const prefs = useNotificationPrefs((s) => s.prefs);
  const defaultLevel = useNotificationPrefs((s) => s.defaultLevel);
  const setNotifyLevel = useNotificationPrefs((s) => s.setLevel);
  const canManage = useHasPermission("manageChannels");
  const canReorder = useHasPermission("reorderChannels");

  const [editingChannel, setEditingChannel] = useState<RichChannel | null>(
    null,
  );
  const [createCategory, setCreateCategory] = useState<
    RichChannel["category"] | null
  >(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const grouped = channels.reduce(
    (acc, ch) => {
      acc[ch.category] = acc[ch.category] || [];
      acc[ch.category].push(ch);
      return acc;
    },
    {} as Record<string, typeof channels>,
  );

  function pickChannel(id: string) {
    setActiveChannel(id);
    closeThread();
    if (pathname !== "/community") router.push("/community");
    onChannelClick?.();
  }

  function handleDelete(ch: RichChannel) {
    if (
      !window.confirm(
        `Delete #${ch.name}? Members will lose access immediately. Messages stay archived.`,
      )
    ) {
      return;
    }
    deleteChannel(ch.id, false);
    toast.success(`#${ch.name} archived.`);
  }

  function handleDragStart(e: React.DragEvent, ch: RichChannel) {
    if (!canReorder) return;
    setDraggingId(ch.id);
    e.dataTransfer.effectAllowed = "move";
    // Setting a payload is required for Firefox to actually fire drop.
    e.dataTransfer.setData("text/plain", ch.id);
  }

  function handleDragOver(e: React.DragEvent, ch: RichChannel) {
    if (!canReorder || !draggingId || draggingId === ch.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetId(ch.id);
  }

  function handleDrop(e: React.DragEvent, ch: RichChannel) {
    e.preventDefault();
    if (!canReorder || !draggingId || draggingId === ch.id) {
      setDropTargetId(null);
      return;
    }
    // Drop in front of the target (Discord-style top-of-line drop).
    const destSiblings = (grouped[ch.category] ?? []).filter(
      (x) => x.id !== draggingId,
    );
    const targetIndex = destSiblings.findIndex((x) => x.id === ch.id);
    moveChannelTo(
      draggingId,
      ch.category,
      targetIndex === -1 ? destSiblings.length : targetIndex,
    );
    setDraggingId(null);
    setDropTargetId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="px-2 py-3">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const chs = grouped[key];
            const category = key as RichChannel["category"];
            // Render the category header even if empty so admins can
            // still create the first channel in it.
            const showHeader = (chs && chs.length > 0) || canManage;
            if (!showHeader) return null;
            return (
              <div key={key} className="mb-3 group/cat">
                <div className="mb-1 flex items-center justify-between gap-1 px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
                    {label}
                  </p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setCreateCategory(category)}
                      className="hidden group-hover/cat:flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
                      aria-label={`Create channel in ${label}`}
                      title={`Create channel in ${label}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {(chs ?? []).map((ch) => {
                  const active =
                    pathname === "/community" && activeChannel === ch.id;
                  const level = prefs[ch.id] ?? defaultLevel;
                  const muted = level === "none";
                  const onlyMentions = level === "mentions";
                  return (
                    <ChannelRow
                      key={ch.id}
                      ch={ch}
                      active={active}
                      muted={muted}
                      onlyMentions={onlyMentions}
                      canManage={canManage}
                      canReorder={canReorder}
                      setNotifyLevel={setNotifyLevel}
                      onPick={pickChannel}
                      onEdit={(c) => setEditingChannel(c)}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      isDragOver={dropTargetId === ch.id}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <ChannelDialog
        open={!!editingChannel}
        onOpenChange={(o) => !o && setEditingChannel(null)}
        channel={editingChannel}
      />
      <ChannelDialog
        open={createCategory !== null}
        onOpenChange={(o) => !o && setCreateCategory(null)}
        defaultCategory={createCategory ?? undefined}
        onSaved={(id) => {
          setActiveChannel(id);
          if (pathname !== "/community") router.push("/community");
        }}
      />
    </>
  );
}

function TopBarTabs({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { hasPermission } = useMe();
  const tabs = hasPermission("viewAdminPanel") ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;
  const unreadDms = useUnreadConversations();
  return (
    <nav className="flex items-center gap-1 shrink-0">
      {tabs.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== "/community" && pathname.startsWith(tab.href + "/"));
        const showBadge = tab.href === "/community/messages" && unreadDms > 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-primary/10 hover:text-primary",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {showBadge && (
              <span
                className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-coral text-white text-[9px] font-bold px-1"
                aria-label={`${unreadDms} unread`}
              >
                {unreadDms > 9 ? "9+" : unreadDms}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function CommunityShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const pathname = usePathname();
  const selectedProfile = useCommunityUI((s) => s.selectedProfile);
  const activeThread = useCommunityUI((s) => s.activeThread);

  // Mounting this once at the shell level keeps the heartbeat alive
  // anywhere inside /community without each page having to opt in.
  usePresenceHeartbeat();
  // Browser geolocation: writes lat/lng to Firestore every 30 min.
  // Powers the #local channel distance filter and event radius.
  useGeoLocation();
  // Sync roles + channels from Firestore so changes propagate
  // across all browsers/devices in realtime.
  useRolesSync();
  useChannelsSync();
  // Eagerly start the singleton members subscription so the avatar
  // status dot, member rows, and chat-message status pills all share
  // ONE Firestore listener instead of spinning up a fresh one per
  // mounted component. (Previously the per-message subscriptions
  // could exhaust browser memory and crash the tab when a portal
  // was opened.)
  usePrimeCommunityMembers();
  // DM browser notifications used to fire only on /community/messages.
  // That meant a user reading a channel got no heads-up when someone
  // DMed them - the only signal was the unread badge in the navbar.
  // Mounting it at the shell ensures notifications fire across every
  // /community/* page. The active-conversation id (read from the URL
  // when on the messages page) suppresses notifications for the
  // conversation the user is actively looking at.
  const sp = useSearchParams();
  const activeDMId = pathname.startsWith("/community/messages")
    ? sp.get("c")
    : null;
  useDMNotifications(activeDMId);
  const myStatus = useMyStatus();

  // Calendar renders its own month-events sidebar, and the messages
  // page is a 2-column DM surface that owns its full width. Suppress
  // the shell rail there to avoid double sidebars.
  // If a member detail or thread is forced open, still show it - those
  // are intentional user actions and shouldn't be silently dropped.
  const calendarPage = pathname === "/community/calendar";
  const messagesPage = pathname.startsWith("/community/messages");
  const railHiddenByPage = calendarPage || messagesPage;
  const showRightRail = !railHiddenByPage || selectedProfile || activeThread;

  // Right rail: thread panel takes priority, then member detail, then default member list.
  const rightRail = activeThread ? (
    <ThreadPanel />
  ) : selectedProfile ? (
    <MemberDetailCard />
  ) : (
    <MembersPanel />
  );

  return (
    <CommunityErrorBoundary>
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* TOP BAR -------------------------------------------------- */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-rosa/20 bg-card/80 backdrop-blur-sm px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open channel menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/ayms-logo.svg"
            alt="AYMS"
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="hidden sm:inline text-base font-bold font-[family-name:var(--font-heading)]">
            Amigas Y Más
          </span>
        </Link>

        <div className="flex-1 flex justify-center overflow-x-auto">
          <TopBarTabs />
        </div>

        <NotificationsButton />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-primary/10 transition-colors">
            <span className="relative inline-flex">
              <Avatar className="h-8 w-8">
                {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-magenta text-white text-xs font-bold">
                  {user ? initials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              {user && (
                <AvatarStatusOverlay
                  status={myStatus}
                  size="sm"
                  borderClass="border-card"
                />
              )}
            </span>
            <div className="hidden md:flex items-center gap-1">
              <span className="text-xs font-semibold max-w-[110px] truncate">
                {user?.name || "Guest"}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            {user && <StatusMenuItems />}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/community/profile")}>
              <User className="mr-2 h-4 w-4" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/")}>
              <Home className="mr-2 h-4 w-4" /> Back to Site
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* BODY: 3-column ----------------------------------------- */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile drawer scrim */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* LEFT: channel list (always visible on lg+, drawer on mobile) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-rosa/20 transition-transform shrink-0",
            "lg:static lg:translate-x-0 lg:top-0 lg:bottom-0",
            drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-12 shrink-0 items-center justify-between px-3 border-b border-rosa/20 lg:hidden">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                Channels
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close channel menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="hidden lg:block px-3 py-2 border-b border-rosa/20">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                Channels
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ChannelSidebar onChannelClick={() => setDrawerOpen(false)} />
            </div>
            <Separator className="bg-rosa/15" />
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Home className="h-3.5 w-3.5" /> Back to Site
            </Link>
          </div>
        </aside>

        {/* CENTER: page content */}
        <main className="flex-1 min-w-0 overflow-hidden bg-background">
          {children}
        </main>

        {/* RIGHT: members / detail / thread */}
        {showRightRail && (
          <aside className="hidden xl:block w-72 shrink-0 border-l border-rosa/20 bg-card/50">
            {rightRail}
          </aside>
        )}
      </div>
    </div>
    </CommunityErrorBoundary>
  );
}
