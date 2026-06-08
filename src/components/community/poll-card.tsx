"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart3,
  Gift,
  Users,
  Trophy,
  Lock,
  Shuffle,
  Clock,
} from "lucide-react";
import type { PollData } from "@/lib/use-firebase-chat";
import { useProfileLookup } from "@/lib/profile-lookup";
import { useCommunityUI } from "@/lib/community-ui-store";
import { cn, initials } from "@/lib/utils";

interface PollCardProps {
  messageId: string;
  authorId: string;
  poll: PollData;
  currentUserId: string | null | undefined;
  canManage: boolean;
  /**
   * Whether the viewer's role allows them to cast / change a vote.
   * Defaults to true so older callers don't break, but the chat page
   * always provides the live `votePolls` permission.
   */
  canVote?: boolean;
  onVote: (optionId: string) => void;
  onPickWinner: () => void;
}

function totalVoters(poll: PollData): number {
  const all = new Set<string>();
  for (const ids of Object.values(poll.votes ?? {})) {
    for (const id of ids) all.add(id);
  }
  return all.size;
}

function useCountdown(closesAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!closesAt) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [closesAt]);
  if (!closesAt) return null;
  const diff = new Date(closesAt).getTime() - now;
  if (diff <= 0) return "Closed";
  const mins = Math.floor(diff / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  if (mins >= 60 * 24) {
    return `${Math.floor(mins / (60 * 24))}d ${Math.floor((mins % (60 * 24)) / 60)}h left`;
  }
  if (mins >= 60) {
    return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
  }
  if (mins >= 1) {
    return `${mins}m ${secs}s left`;
  }
  return `${secs}s left`;
}

function WinnerCard({ winnerId }: { winnerId: string }) {
  const winner = useProfileLookup(winnerId);
  return (
    <div className="rounded-lg border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-rosa/15 p-3 flex items-center gap-3">
      <Trophy className="h-7 w-7 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
          Winner
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Avatar className="h-6 w-6">
            {winner?.avatar && (
              <AvatarImage src={winner.avatar} alt={winner.name} />
            )}
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/30 to-rosa/40 text-primary font-semibold">
              {initials(winner?.name ?? "??")}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-semibold truncate">
            {winner?.name ?? "Unknown member"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PollCard({
  messageId,
  authorId,
  poll,
  currentUserId,
  canManage,
  canVote = true,
  onVote,
  onPickWinner,
}: PollCardProps) {
  const selectProfile = useCommunityUI((s) => s.selectProfile);
  const total = totalVoters(poll);
  const isClosed =
    !!poll.closesAt && new Date(poll.closesAt).getTime() <= Date.now();
  const countdown = useCountdown(poll.closesAt);
  const isAuthor = currentUserId === authorId;
  const canDraw =
    poll.kind === "giveaway" &&
    !poll.winnerId &&
    isClosed &&
    (isAuthor || canManage);
  // A click on an option is disabled if the poll is closed OR the
  // viewer's role doesn't include votePolls.
  const interactive = !isClosed && canVote;

  return (
    <div className="mt-1.5 max-w-md rounded-xl border border-rosa/30 bg-gradient-to-br from-card to-rosa/5 p-3 space-y-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        {poll.kind === "poll" ? (
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Gift className="h-3.5 w-3.5 text-primary" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
          {poll.kind === "poll" ? "Poll" : "Giveaway"}
          {poll.multiple && " · multi-choice"}
        </span>
        {poll.closesAt && (
          <span
            className={cn(
              "ml-auto text-[10px] flex items-center gap-1",
              isClosed ? "text-muted-foreground" : "text-coral",
            )}
          >
            {isClosed ? <Lock className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
            {countdown}
          </span>
        )}
      </div>

      <h4 className="text-sm font-semibold leading-snug">
        {poll.question}
      </h4>

      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const votes = poll.votes?.[opt.id] ?? [];
          const pct = total === 0 ? 0 : Math.round((votes.length / total) * 100);
          const youVoted = !!currentUserId && votes.includes(currentUserId);
          const isWinner = poll.winnerId && votes.includes(poll.winnerId);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => interactive && onVote(opt.id)}
              disabled={!interactive}
              title={
                !canVote
                  ? "You don't have permission to vote in polls."
                  : isClosed
                    ? "This poll is closed."
                    : undefined
              }
              className={cn(
                "relative w-full overflow-hidden rounded-lg border text-left text-sm transition-all",
                youVoted
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
                !interactive && "cursor-default",
                isWinner && "ring-2 ring-primary/50",
              )}
            >
              {/* Bar fill */}
              <span
                className={cn(
                  "absolute inset-y-0 left-0 transition-all",
                  youVoted ? "bg-primary/15" : "bg-rosa/15",
                )}
                style={{ width: `${pct}%` }}
                aria-hidden
              />
              <span className="relative flex items-center gap-2 px-3 py-2">
                <span className="flex-1 truncate font-medium">
                  {opt.text}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                  {votes.length} · {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {!canVote && !isClosed && (
        <p className="text-[11px] italic text-muted-foreground">
          Your role doesn&apos;t include the &quot;Vote in polls&quot; permission.
        </p>
      )}

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-2.5 w-2.5" />
          {total} {total === 1 ? "voter" : "voters"}
        </span>
        {poll.kind === "giveaway" && total > 0 && (
          <button
            type="button"
            onClick={() => {
              // Show entrant list via the first profile
              const ids = Array.from(
                new Set(Object.values(poll.votes ?? {}).flat()),
              );
              if (ids[0]) selectProfile({ id: ids[0] });
            }}
            className="hover:text-primary"
          >
            View entrants
          </button>
        )}
      </div>

      {poll.kind === "giveaway" && (
        <>
          {poll.winnerId ? (
            <WinnerCard winnerId={poll.winnerId} />
          ) : canDraw ? (
            <Button
              size="sm"
              onClick={onPickWinner}
              className="w-full bg-gradient-to-r from-primary to-magenta text-white"
            >
              <Shuffle className="h-3.5 w-3.5 mr-1.5" />
              Pick a winner
            </Button>
          ) : isClosed ? (
            <p className="text-[11px] text-muted-foreground italic text-center">
              Drawing time reached. Waiting for the host to pick a winner.
            </p>
          ) : null}
        </>
      )}
      {/* Reference messageId so we don't hide it via lint */}
      <span className="hidden" data-poll-id={messageId} />
    </div>
  );
}
