"use client";

/**
 * "Online now" horizontal rail for the community home page.
 *
 * Pulls the live presence-enriched member list from
 * use-community-members.ts (which already buckets online/away/offline)
 * and renders online amigas first, then away, as tappable avatars that
 * open the existing profile mini-card.
 *
 * Light theme (community area). Honest empty state when nobody's around.
 */

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useCommunityMembers } from "@/lib/use-community-members";
import { useAuth } from "@/lib/store";
import { formatDisplayName } from "@/lib/name-format";
import { AvatarStatusOverlay } from "./status-indicator";
import { ProfileMiniTrigger } from "./profile-mini-card";
import { initials } from "@/lib/utils";
import { Radio } from "lucide-react";

export function OnlineNowRail() {
  const { online, away, loading, isLive } = useCommunityMembers();
  const currentUserId = useAuth((s) => s.user?.id);

  // Online amigas first, then away. Exclude self so the rail shows
  // "who else is here". Capped so the rail stays a glanceable strip.
  const people = useMemo(() => {
    const merged = [...online, ...away].filter((m) => m.id !== currentUserId);
    return merged.slice(0, 24);
  }, [online, away, currentUserId]);

  return (
    <section aria-label="Online now">
      <div className="mb-2 flex items-center gap-1.5">
        <Radio className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
          Online now
        </h2>
        {people.length > 0 && (
          <span className="text-xs text-muted-foreground">
            · {people.length}
          </span>
        )}
      </div>

      {loading && people.length === 0 ? (
        <div className="flex gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex w-16 flex-col items-center gap-1.5">
              <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
              <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rosa/40 bg-blush/10 px-4 py-5 text-center">
          <p className="text-sm text-foreground/80">
            It&apos;s quiet right now — you might be the first one here today ♡
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isLive
              ? "Amigas pop up here the moment they open the community."
              : "Presence is local-only — Firebase isn't configured."}
          </p>
        </div>
      ) : (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            {people.map((m) => {
              const displayName = formatDisplayName(m.name, m.nameDisplay);
              const firstName = displayName.split(/\s+/)[0] || displayName;
              return (
                <ProfileMiniTrigger
                  key={m.id}
                  userId={m.id}
                  snapshot={{ name: m.name, avatar: m.avatar }}
                  placement="top-center"
                >
                  {({ triggerRef, onClick, open }) => (
                    <button
                      type="button"
                      ref={triggerRef as React.RefObject<HTMLButtonElement>}
                      onClick={onClick}
                      className="group flex w-16 shrink-0 flex-col items-center gap-1.5 focus:outline-none"
                      aria-label={`${displayName}, ${m.status}`}
                    >
                      <span className="relative">
                        <Avatar className="h-14 w-14 ring-2 ring-transparent transition-all group-hover:ring-primary/40 group-focus-visible:ring-primary">
                          {m.avatar && (
                            <AvatarImage src={m.avatar} alt={displayName} />
                          )}
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-rosa/40 text-primary text-base font-semibold">
                            {initials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <AvatarStatusOverlay
                          status={m.status}
                          size="md"
                          borderClass="border-card"
                        />
                        {open && (
                          <span className="absolute inset-0 rounded-full ring-2 ring-primary" />
                        )}
                      </span>
                      <span className="max-w-full truncate text-[11px] font-medium text-foreground/80 group-hover:text-foreground">
                        {firstName}
                      </span>
                    </button>
                  )}
                </ProfileMiniTrigger>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </section>
  );
}
