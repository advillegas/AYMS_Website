"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Search,
  ShieldCheck,
  Mail,
  MapPin,
  Calendar as CalIcon,
  Trash2,
  RotateCcw,
  Ban,
  MicOff,
  Mic,
  UserX,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  useCommunityMembers,
  type MemberWithStatus,
} from "@/lib/use-community-members";
import { useRoles, useMe } from "@/lib/use-roles-store";
import {
  useModeration,
  useIsBanned,
  useMuteEntry,
} from "@/lib/use-moderation-store";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getSupabase, useSupabaseBackend } from "@/lib/supabase";
import { BackendBadge } from "@/components/admin/backend-badge";
import {
  AvatarStatusOverlay,
  statusLabel,
} from "@/components/community/status-indicator";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { doc, deleteDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminMembersPage() {
  const { members, online, away, offline, isLive, loading } =
    useCommunityMembers();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q),
    );
  }, [members, query]);

  const selected = filtered.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
            <Users className="h-6 w-6 text-primary" />
            Members admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live view of every registered member, sourced from your backend.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <SummaryChip
              label={`${members.length} total`}
              tone="muted"
            />
            <SummaryChip label={`${online.length} online`} tone="online" />
            <SummaryChip label={`${away.length} away`} tone="away" />
            <SummaryChip label={`${offline.length} offline`} tone="offline" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BackendBadge live={isLive} />
        </div>
      </div>

      {!(isFirebaseConfigured || useSupabaseBackend) && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 text-sm text-amber-900 dark:text-amber-200">
            No live backend is configured. The list below shows mock + local
            registry users only. Add the{" "}
            <code className="text-xs">NEXT_PUBLIC_FIREBASE_*</code> (or
            Supabase) env vars to sync registered users across devices.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or location"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
              {loading && filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground italic">
                  Loading members…
                </p>
              )}
              {!loading && filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {query
                    ? "No members match that search."
                    : "No members yet."}
                </p>
              )}
              {filtered.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  selected={selectedId === m.id}
                  onSelect={() => setSelectedId(m.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:sticky lg:top-4 self-start">
          {selected ? (
            <MemberDetail member={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                Pick a member on the left to view their profile and edit roles.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  tone,
}: {
  label: string;
  tone: "online" | "away" | "offline" | "muted";
}) {
  const toneClass =
    tone === "online"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "away"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : tone === "offline"
          ? "bg-muted text-muted-foreground"
          : "bg-primary/10 text-primary";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
        toneClass,
      )}
    >
      {label}
    </span>
  );
}

interface MemberRowProps {
  member: MemberWithStatus;
  selected: boolean;
  onSelect: () => void;
}

function MemberRow({ member, selected, onSelect }: MemberRowProps) {
  const lastSeen =
    member.lastActiveAt && member.status === "offline"
      ? `Last seen ${formatDistanceToNow(member.lastActiveAt, {
          addSuffix: true,
        })}`
      : statusLabel(member.status);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
        selected ? "bg-primary/10" : "hover:bg-primary/5",
      )}
    >
      <span className="relative shrink-0">
        <Avatar
          className={cn(
            "h-10 w-10",
            member.status === "offline" && "opacity-70",
          )}
        >
          {member.avatar && (
            <AvatarImage src={member.avatar} alt={member.name} />
          )}
          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-rosa/40 text-primary font-semibold">
            {initials(member.name)}
          </AvatarFallback>
        </Avatar>
        <AvatarStatusOverlay
          status={member.status}
          size="sm"
          borderClass="border-card"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{member.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {member.email || "no email on file"}
        </p>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
          {lastSeen}
        </p>
      </div>
      {member.isLive && (
        <span
          className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400"
          title="This member is synced to Firestore"
        >
          live
        </span>
      )}
    </button>
  );
}

interface MemberDetailProps {
  member: MemberWithStatus;
  onClose: () => void;
}

function MemberDetail({ member, onClose }: MemberDetailProps) {
  const allRoles = useRoles((s) => s.roles);
  const userRoles = useRoles((s) => s.userRoles);
  const toggleUserRole = useRoles((s) => s.toggleUserRole);
  const confirm = useConfirm();
  const { user: me, hasPermission } = useMe();
  const moderation = useModeration();
  const isBanned = useIsBanned(member.id);
  const muteEntry = useMuteEntry(member.id);
  const canBan = hasPermission("banMembers");
  const canMute = hasPermission("muteMembers");
  const canKick = hasPermission("kickMembers");
  const showModeration = canBan || canMute || canKick;
  const actor = me ? { id: me.id, name: me.name } : null;
  const myRoleIds = userRoles[member.id] ?? [];
  const lastSeen =
    member.lastActiveAt
      ? `Last seen ${formatDistanceToNow(member.lastActiveAt, {
          addSuffix: true,
        })}`
      : "Never seen";

  async function handleHardDelete() {
    if (!member.isLive) {
      toast.error(
        "This member only exists locally. Nothing to delete from the backend.",
      );
      return;
    }
    const confirmed = await confirm({
      title: `Delete ${member.name}'s profile?`,
      description: `This removes ${member.name}'s profile from the live backend (their auth account is unaffected). This can't be undone.`,
      confirmText: "Delete profile",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      if (useSupabaseBackend) {
        const sb = getSupabase();
        if (sb) {
          const { error } = await sb.from("users").delete().eq("id", member.id);
          if (error) throw new Error(error.message);
        }
      }
      const db = getDb();
      if (db) {
        await deleteDoc(doc(db, "users", member.id));
      }
      toast.success(`${member.name}'s profile removed`);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete the profile. Check console for details.");
    }
  }

  async function handleBanToggle() {
    if (!actor) return;
    if (isBanned) {
      moderation.unban(member.id, actor, member.name);
      toast.success(`${member.name} has been unbanned.`);
      return;
    }
    const ok = await confirm({
      title: `Ban ${member.name}?`,
      description:
        "They'll be blocked from posting and their existing messages hidden. They'll be notified. You can unban them later.",
      destructive: true,
      confirmText: "Ban member",
    });
    if (!ok) return;
    moderation.ban(member.id, actor, "Banned from members admin", member.name);
    toast.success(`${member.name} has been banned.`);
  }

  function handleMute(durationMs: number | null) {
    if (!actor) return;
    moderation.mute(
      member.id,
      actor,
      "Muted from members admin",
      durationMs,
      member.name,
    );
    toast.success(
      durationMs
        ? `${member.name} muted until ${new Date(
            Date.now() + durationMs,
          ).toLocaleString()}.`
        : `${member.name} muted indefinitely.`,
    );
  }

  function handleUnmute() {
    if (!actor) return;
    moderation.unmute(member.id, actor, member.name);
    toast.success(`${member.name} has been unmuted.`);
  }

  async function handleKick() {
    if (!actor) return;
    const ok = await confirm({
      title: `Kick ${member.name}?`,
      description:
        "Removes their community profile (they can re-join). Their auth account is unaffected. They'll be notified.",
      destructive: true,
      confirmText: "Kick member",
    });
    if (!ok) return;
    await moderation.kick(
      member.id,
      actor,
      "Kicked from members admin",
      member.name,
    );
    toast.success(`${member.name} has been removed.`);
    onClose();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="relative shrink-0">
            <Avatar className="h-16 w-16">
              {member.avatar && (
                <AvatarImage src={member.avatar} alt={member.name} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary to-magenta text-white text-xl font-bold">
                {initials(member.name)}
              </AvatarFallback>
            </Avatar>
            <AvatarStatusOverlay
              status={member.status}
              size="md"
              borderClass="border-card"
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold truncate">{member.name}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {member.email}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {statusLabel(member.status)} · {lastSeen}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {member.bio && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Bio
            </p>
            <p className="text-sm text-foreground/85">{member.bio}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          {member.location && (
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
              <span>{member.location}</span>
            </div>
          )}
          <div className="flex items-start gap-1.5">
            <CalIcon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
            <span>Joined {format(new Date(member.joinedDate), "MMM d, yyyy")}</span>
          </div>
          {member.email && (
            <div className="flex items-start gap-1.5 col-span-2">
              <Mail className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
              <span className="break-all">{member.email}</span>
            </div>
          )}
          <div className="flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
            <span className="capitalize">{member.role}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Roles assigned
          </p>
          <div className="space-y-1.5">
            {allRoles
              .slice()
              .sort((a, b) => b.priority - a.priority)
              .map((r) => {
                const checked = myRoleIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm cursor-pointer transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-primary/5",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        toggleUserRole(member.id, r.id)
                      }
                    />
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="flex-1">{r.name}</span>
                    {r.system && (
                      <span className="text-[10px] uppercase text-muted-foreground tracking-wider">
                        system
                      </span>
                    )}
                  </label>
                );
              })}
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Role assignments are persisted in localStorage. Server-side
            enforcement requires mirroring these in Firestore rules.
          </p>
        </div>

        {showModeration && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Moderation
              </p>
              {(isBanned || muteEntry) && (
                <div className="flex flex-wrap gap-1.5">
                  {isBanned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                      <Ban className="h-3 w-3" /> Banned
                    </span>
                  )}
                  {muteEntry && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      <MicOff className="h-3 w-3" />
                      {muteEntry.until
                        ? `Muted until ${format(new Date(muteEntry.until), "MMM d, h:mm a")}`
                        : "Muted"}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {canMute &&
                  (muteEntry ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnmute}
                      className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    >
                      <Mic className="h-3.5 w-3.5 mr-1" /> Unmute
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMute(60 * 60 * 1000)}
                      >
                        <MicOff className="h-3.5 w-3.5 mr-1" /> Mute 1h
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMute(24 * 60 * 60 * 1000)}
                      >
                        <MicOff className="h-3.5 w-3.5 mr-1" /> Mute 24h
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMute(null)}
                      >
                        <MicOff className="h-3.5 w-3.5 mr-1" /> Mute ∞
                      </Button>
                    </>
                  ))}
                {canBan && (
                  <Button
                    variant={isBanned ? "outline" : "ghost"}
                    size="sm"
                    onClick={handleBanToggle}
                    className={cn(
                      isBanned
                        ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                        : "text-destructive hover:text-destructive hover:bg-destructive/10",
                    )}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    {isBanned ? "Unban" : "Ban"}
                  </Button>
                )}
                {canKick && member.isLive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleKick}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" /> Kick
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Bans/mutes sync live via{" "}
                <code className="text-[10px]">config/moderation</code>. Firestore
                security rules are the real server-side backstop.
              </p>
            </div>
          </>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Close
          </Button>
          {member.isLive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHardDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove from Firestore
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
