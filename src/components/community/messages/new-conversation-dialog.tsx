"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/store";
import { useCommunityMembers } from "@/lib/use-community-members";
import {
  getOrCreateDM,
  createGroupConversation,
  resolveToFirebaseUid,
} from "@/lib/use-conversations";
import { useFriendIdSet } from "@/lib/use-friends";
import { formatDisplayName } from "@/lib/name-format";
import { isFirebaseConfigured } from "@/lib/firebase";
import { toast } from "sonner";
import { Search, X, Check, Users, MessageCircle, Loader2 } from "lucide-react";
import { cn, initials } from "@/lib/utils";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Optional seed list of pre-selected user IDs (e.g. when extending
   * an existing conversation into a new group). */
  initialSelected?: string[];
}

/**
 * Modal that lets the user start a new conversation. Pick one member
 * for a 1:1 DM (deduped via dmConversationId) or pick multiple for a
 * group, optionally giving the group a name.
 */
export function NewConversationDialog({
  open,
  onOpenChange,
  initialSelected = [],
}: NewConversationDialogProps) {
  const router = useRouter();
  const currentUser = useAuth((s) => s.user);
  const { members, loading: membersLoading } = useCommunityMembers();
  const friendIds = useFriendIdSet();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected),
  );
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);

  // Pool: every community member except yourself, sorted by name.
  const candidates = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return members
      .filter((m) => m.id !== currentUser?.id)
      .filter((m) =>
        lower
          ? m.name.toLowerCase().includes(lower) ||
            (m.email ?? "").toLowerCase().includes(lower) ||
            (m.location ?? "").toLowerCase().includes(lower)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, currentUser, search]);

  const isGroup = selected.size > 1;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setSearch("");
    setSelected(new Set());
    setGroupName("");
    setBusy(false);
  }

  async function handleStart() {
    if (!currentUser) return;
    if (selected.size === 0) {
      toast.error("Pick at least one person.");
      return;
    }
    if (!isFirebaseConfigured) {
      toast.error("Direct messages need Firebase to be configured.");
      return;
    }

    setBusy(true);
    try {
      const ids = Array.from(selected);
      let cid: string | null = null;
      if (ids.length === 1) {
        const target = members.find((m) => m.id === ids[0]);
        const result = await getOrCreateDM(currentUser.id, ids[0], {
          friendIds,
          otherEmail: target?.email,
        });
        if (!result.id) {
          toast.error(result.error?.reason ?? "Couldn't open the conversation. Try again.");
          return;
        }
        cid = result.id;
      } else {
        // Resolve each participant to their real Firebase UID so the
        // group is visible from every member's side.
        const resolvedIds = await Promise.all(
          ids.map((id) => {
            const m = members.find((x) => x.id === id);
            return resolveToFirebaseUid(id, m?.email);
          }),
        );
        cid = await createGroupConversation(
          currentUser.id,
          resolvedIds,
          { name: groupName.trim() || undefined },
        );
      }
      if (!cid) {
        toast.error("Couldn't open the conversation. Try again.");
        return;
      }
      reset();
      onOpenChange(false);
      router.push(`/community/messages?c=${encodeURIComponent(cid)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-[#B51760]">
            {isGroup ? (
              <Users className="h-4 w-4 text-[#FF0099]" />
            ) : (
              <MessageCircle className="h-4 w-4 text-[#FF0099]" />
            )}
            {isGroup ? "New group chat" : "New message"}
          </DialogTitle>
          <DialogDescription>
            Pick one amiga for a direct message, or several to start a
            group chat.
          </DialogDescription>
        </DialogHeader>

        {/* Selected pills */}
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-rosa/20 bg-muted/40 p-2">
            {Array.from(selected).map((id) => {
              const m = members.find((x) => x.id === id);
              if (!m) return null;
              const label = formatDisplayName(m.name, m.nameDisplay);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="rounded-full hover:bg-primary/20 p-0.5"
                    aria-label={`Remove ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {isGroup && (
          <div className="space-y-1.5">
            <Label htmlFor="group-name" className="text-xs">
              Group name (optional)
            </Label>
            <Input
              id="group-name"
              placeholder="e.g. Cancún Crew"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={60}
              className="h-9 text-sm"
            />
          </div>
        )}

        {/* Search + member list */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search amigas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto rounded-lg border border-rosa/15 divide-y divide-rosa/10">
            {membersLoading && candidates.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-3 py-4 text-center text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading amigas...
              </p>
            ) : candidates.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                {search.trim() ? "No amigas match your search." : "No amigas found."}
              </p>
            ) : (
              candidates.map((m) => {
                const checked = selected.has(m.id);
                const label = formatDisplayName(m.name, m.nameDisplay);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors",
                      checked ? "bg-primary/8" : "hover:bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/40 bg-background",
                      )}
                    >
                      {checked && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </span>
                    <Avatar className="h-7 w-7 shrink-0">
                      {m.avatar && <AvatarImage src={m.avatar} alt={label} />}
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/25 to-rosa/40 text-primary font-semibold">
                        {initials(label)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">
                        {label}
                      </span>
                      {m.location && (
                        <span className="block text-[10px] text-muted-foreground truncate">
                          {m.location}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {selected.size === 0
              ? "Pick at least one amiga."
              : selected.size === 1
                ? "1 person selected · 1:1 DM"
                : `${selected.size} people selected · group chat`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStart}
              disabled={busy || selected.size === 0}
              className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : isGroup ? (
                "Start group chat"
              ) : (
                "Send a message"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
