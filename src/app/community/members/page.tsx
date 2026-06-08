"use client";

import { useState } from "react";
import { useUserRoles } from "@/lib/use-roles-store";
import {
  useCommunityMembers,
  type MemberWithStatus,
} from "@/lib/use-community-members";
import { useIncomingFriendRequestCount } from "@/lib/use-friends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MapPin, Calendar, UserRound, Heart } from "lucide-react";
import { format, parseISO, isValid, formatDistanceToNow } from "date-fns";
import { cn, initials } from "@/lib/utils";
import { AvatarStatusOverlay, statusLabel } from "@/components/community/status-indicator";
import { formatDisplayName } from "@/lib/name-format";
import { ProfileMiniTrigger } from "@/components/community/profile-mini-card";
import { FriendsHub } from "@/components/community/friends-hub";

function MemberRoleChips({ memberId }: { memberId: string }) {
  const roles = useUserRoles(memberId);
  if (roles.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r.id}
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: `${r.color}20`,
            color: r.color,
          }}
        >
          {r.name}
        </span>
      ))}
    </span>
  );
}

function MemberNameButton({
  memberId,
  fallbackRole,
  className,
  children,
}: {
  memberId: string;
  fallbackRole: string;
  className?: string;
  children: React.ReactNode;
}) {
  const roles = useUserRoles(memberId);
  const color = roles[0]?.color;
  return (
    <h3
      className={cn(
        "font-semibold truncate decoration-current underline-offset-2",
        className,
      )}
      style={color ? { color } : undefined}
    >
      {children}
      <span className="sr-only"> - {fallbackRole}</span>
    </h3>
  );
}

function MemberCard({ member }: { member: MemberWithStatus }) {
  const displayName = formatDisplayName(member.name, member.nameDisplay);

  const lastSeen =
    member.lastActiveAt && member.status === "offline"
      ? `Last seen ${formatDistanceToNow(member.lastActiveAt, { addSuffix: true })}`
      : statusLabel(member.status);

  // joinedDate can be missing or unparseable for some records. Only
  // format when it resolves to a valid date — otherwise omit the row
  // rather than render "Invalid Date".
  const joinedParsed = member.joinedDate ? parseISO(member.joinedDate) : null;
  const joinedLabel =
    joinedParsed && isValid(joinedParsed)
      ? format(joinedParsed, "MMM yyyy")
      : null;

  return (
    <ProfileMiniTrigger
      userId={member.id}
      snapshot={{ name: member.name, avatar: member.avatar }}
      placement="top-center"
    >
      {({ triggerRef, onClick, open }) => (
        <button
          type="button"
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          onClick={onClick}
          className="text-left group focus:outline-none w-full"
        >
          <Card
            className={cn(
              "transition-all cursor-pointer h-full",
              "group-hover:shadow-lg group-hover:border-primary/40 group-hover:-translate-y-0.5",
              "group-focus-visible:ring-2 group-focus-visible:ring-primary",
              open && "ring-2 ring-primary border-primary",
              member.status === "offline" && "opacity-80",
            )}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <Avatar
                    className={cn(
                      "h-14 w-14",
                      member.status === "offline" && "opacity-70",
                    )}
                  >
                    {member.avatar && (
                      <AvatarImage src={member.avatar} alt={displayName} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-rosa/40 text-primary text-lg font-semibold">
                      {initials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <AvatarStatusOverlay
                    status={member.status}
                    size="md"
                    borderClass="border-card"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MemberNameButton
                      memberId={member.id}
                      fallbackRole={member.role}
                      className="group-hover:underline"
                    >
                      {displayName}
                    </MemberNameButton>
                    <MemberRoleChips memberId={member.id} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {lastSeen}
                  </p>
                  {member.bio && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {member.bio}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {member.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {member.location}
                      </span>
                    )}
                    {joinedLabel && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {joinedLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>
      )}
    </ProfileMiniTrigger>
  );
}

type MembersTab = "directory" | "friends";

export default function MembersPage() {
  const { members, online, away, offline, isLive } = useCommunityMembers();
  const [tab, setTab] = useState<MembersTab>("directory");
  const incomingCount = useIncomingFriendRequestCount();

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
          <Users className="h-6 w-6 text-primary" />
          Community Members
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {members.length} amigas · {online.length} online · {away.length} away
          · {offline.length} offline
        </p>
        <p className="text-xs text-muted-foreground/80 mt-0.5">
          Click any member to see their profile.{" "}
          {!isLive && (
            <span className="italic">
              (Presence is local-only — Firebase isn&apos;t configured)
            </span>
          )}
        </p>
      </div>

      {/* Directory / Friends tab switcher */}
      <div
        role="tablist"
        aria-label="Members view"
        className="mb-6 inline-flex items-center rounded-full border border-rosa/30 bg-card/70 p-1 text-sm font-medium"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "directory"}
          onClick={() => setTab("directory")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all",
            tab === "directory"
              ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_2px_8px_rgb(255_0_153/0.3)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <UserRound className="h-4 w-4" />
          Directory
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "friends"}
          onClick={() => setTab("friends")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-all",
            tab === "friends"
              ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_2px_8px_rgb(255_0_153/0.3)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Heart className="h-4 w-4" />
          Friends
          {incomingCount > 0 && (
            <span
              className={cn(
                "ml-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                tab === "friends"
                  ? "bg-white/30 text-white"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {incomingCount > 9 ? "9+" : incomingCount}
            </span>
          )}
        </button>
      </div>

      {tab === "directory" ? <DirectoryView /> : <FriendsHub />}
    </div>
  );
}

function DirectoryView() {
  const { members, online, away, offline, loading } = useCommunityMembers();

  if (loading && members.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {online.length > 0 && (
        <Section title="Online" tone="online" count={online.length}>
          {online.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </Section>
      )}
      {away.length > 0 && (
        <Section title="Away" tone="away" count={away.length}>
          {away.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </Section>
      )}
      {offline.length > 0 && (
        <Section title="Offline" tone="offline" count={offline.length}>
          {offline.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </Section>
      )}
      {members.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          No members yet.
        </p>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  count: number;
  tone: "online" | "away" | "offline";
  children: React.ReactNode;
}

function Section({ title, count, tone, children }: SectionProps) {
  const toneClass =
    tone === "online"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "away"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";
  return (
    <section>
      <h2
        className={cn(
          "mb-3 text-xs font-semibold uppercase tracking-wider",
          toneClass,
        )}
      >
        {title} — {count}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}
