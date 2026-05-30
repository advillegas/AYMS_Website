"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCommunityMembers } from "@/lib/use-community-members";
import { useFriendships } from "@/lib/use-friends";
import { useAuth } from "@/lib/store";
import { formatDisplayName } from "@/lib/name-format";
import { cn } from "@/lib/utils";
import { X, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface TopFriendsEditorProps {
  topFriendIds: string[];
  onChange: (ids: string[]) => void;
  readOnly?: boolean;
}

export function TopFriendsEditor({
  topFriendIds,
  onChange,
  readOnly,
}: TopFriendsEditorProps) {
  const currentUser = useAuth((s) => s.user);
  const { friends } = useFriendships();
  const { members } = useCommunityMembers();
  const [adding, setAdding] = useState(false);

  const friendMembers = useMemo(() => {
    const friendUids = new Set<string>();
    for (const f of friends) {
      if (f.status !== "accepted") continue;
      for (const id of f.participantIds) {
        if (id !== currentUser?.id) friendUids.add(id);
      }
    }
    return members.filter((m) => friendUids.has(m.id));
  }, [friends, members, currentUser?.id]);

  const topFriends = useMemo(() => {
    return topFriendIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean) as typeof members;
  }, [topFriendIds, members]);

  const addable = useMemo(() => {
    const existing = new Set(topFriendIds);
    return friendMembers.filter((m) => !existing.has(m.id));
  }, [friendMembers, topFriendIds]);

  if (readOnly) {
    if (topFriends.length === 0) return null;
    return (
      <div className="grid grid-cols-4 gap-3">
        {topFriends.map((f) => {
          const name = formatDisplayName(f.name, f.nameDisplay);
          return (
            <Link
              key={f.id}
              href={`/community/profile/${f.id}`}
              className="flex flex-col items-center gap-1 text-center group"
            >
              <Avatar className="h-14 w-14 ring-2 ring-rosa/30 group-hover:ring-primary transition-all">
                {f.avatar && <AvatarImage src={f.avatar} alt={name} />}
                <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-sm font-semibold">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[11px] leading-tight truncate w-full text-foreground/80 group-hover:text-primary transition-colors">
                {name.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topFriends.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {topFriends.map((f) => {
            const name = formatDisplayName(f.name, f.nameDisplay);
            return (
              <div key={f.id} className="relative flex flex-col items-center gap-1">
                <Avatar className="h-14 w-14 ring-2 ring-rosa/30">
                  {f.avatar && <AvatarImage src={f.avatar} alt={name} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-sm font-semibold">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] truncate w-full text-center">
                  {name.split(" ")[0]}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange(topFriendIds.filter((id) => id !== f.id))
                  }
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {topFriendIds.length < 8 && (
        <>
          {!adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 px-3 py-1.5 text-xs font-medium text-primary/70 hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add top friend ({topFriendIds.length}/8)
            </button>
          ) : (
            <div className="rounded-lg border border-rosa/20 bg-card p-2 space-y-1 max-h-40 overflow-y-auto">
              {addable.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-2 py-2">
                  {friendMembers.length === 0
                    ? "Add some friends first!"
                    : "All your friends are already in your top list."}
                </p>
              ) : (
                addable.map((m) => {
                  const name = formatDisplayName(m.name, m.nameDisplay);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onChange([...topFriendIds, m.id]);
                        if (topFriendIds.length + 1 >= 8) setAdding(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-primary/5 text-left"
                    >
                      <Avatar className="h-7 w-7">
                        {m.avatar && <AvatarImage src={m.avatar} alt={name} />}
                        <AvatarFallback className="text-[9px] bg-gradient-to-br from-primary/25 to-rosa/40 text-primary font-semibold">
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">{name}</span>
                    </button>
                  );
                })
              )}
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-[10px] text-muted-foreground hover:underline px-2"
              >
                Done
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
