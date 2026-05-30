"use client";

import { useUserRoles } from "@/lib/use-roles-store";
import {
  useCommunityMembers,
  type MemberWithStatus,
} from "@/lib/use-community-members";
import { useAuth } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MapPin, Calendar } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { AvatarStatusOverlay, statusLabel } from "@/components/community/status-indicator";
import { formatDisplayName } from "@/lib/name-format";
import { ProfileMiniTrigger } from "@/components/community/profile-mini-card";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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
  const currentUserId = useAuth((s) => s.user?.id);
  const isSelf = currentUserId === member.id;
  const displayName = formatDisplayName(member.name, member.nameDisplay);

  const lastSeen =
    member.lastActiveAt && member.status === "offline"
      ? `Last seen ${formatDistanceToNow(member.lastActiveAt, { addSuffix: true })}`
      : statusLabel(member.status);

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
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {format(parseISO(member.joinedDate), "MMM yyyy")}
                    </span>
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

export default function MembersPage() {
  const { members, online, away, offline, loading, isLive } =
    useCommunityMembers();

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mb-6">
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

      {loading && members.length === 0 ? (
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
      ) : (
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
