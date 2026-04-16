"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useChat, useCommunity } from "@/lib/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
// tooltips removed — base-ui API doesn't support asChild
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
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Chat", href: "/community", icon: MessageSquare },
  { label: "Calendar", href: "/community/calendar", icon: Calendar },
  { label: "Members", href: "/community/members", icon: Users },
  { label: "Profile", href: "/community/profile", icon: User },
];

export function CommunityShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const channels = useChat((s) => s.channels);
  const activeChannel = useChat((s) => s.activeChannel);
  const setActiveChannel = useChat((s) => s.setActiveChannel);
  const onlineMembers = useCommunity((s) => s.onlineMembers);

  const isChat = pathname === "/community";

  const grouped = channels.reduce(
    (acc, ch) => {
      acc[ch.category] = acc[ch.category] || [];
      acc[ch.category].push(ch);
      return acc;
    },
    {} as Record<string, typeof channels>,
  );

  const categoryLabels: Record<string, string> = {
    general: "General",
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

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
        <Link href="/" className="text-lg font-bold truncate">
          Amigas Y Más
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex gap-1 p-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
              pathname === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        ))}
      </nav>

      <Separator />

      {isChat && (
        <ScrollArea className="flex-1 px-2 py-2">
          {Object.entries(categoryLabels).map(([key, label]) => {
            const chs = grouped[key];
            if (!chs) return null;
            return (
              <div key={key} className="mb-3">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {label}
                </p>
                {chs.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      activeChannel === ch.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <Hash className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </ScrollArea>
      )}

      {!isChat && (
        <ScrollArea className="flex-1 px-2 py-2">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Online — {onlineMembers.length}
          </p>
          {useCommunity
            .getState()
            .members.filter((m) => onlineMembers.includes(m.id))
            .map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70"
              >
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-green-500" />
                </div>
                <span className="truncate">{m.name}</span>
              </div>
            ))}
        </ScrollArea>
      )}

      <Separator />

      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent/50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {user ? initials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="truncate text-sm font-medium">
                  {user?.name || "Guest"}
                </p>
                <p className="truncate text-[10px] text-sidebar-foreground/50">
                  {user?.email || ""}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem render={<Link href="/community/profile" />}>
              <User className="mr-2 h-4 w-4" /> My Profile
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
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebar}
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Community</span>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
