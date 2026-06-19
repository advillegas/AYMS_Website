"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  addParticipants,
  resolveToFirebaseUid,
  type Conversation,
} from "@/lib/use-conversations";
import { formatDisplayName } from "@/lib/name-format";
import { toast } from "sonner";
import { Search, Check, Loader2, UserPlus } from "lucide-react";
import { cn, initials } from "@/lib/utils";

interface AddParticipantsDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  conversation: Conversation;
}

/**
 * Invite additional amigas to an existing conversation. If invoked on a
 * 1:1 DM, adding even one new person promotes it to a group (handled
 * server-side in addParticipants).
 */
export function AddParticipantsDialog({
  open,
  onOpenChange,
  conversation,
}: AddParticipantsDialogProps) {
  const currentUser = useAuth((s) => s.user);
  const { members, loading: membersLoading } = useCommunityMembers();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  // Pool: every community member who isn't already in the conversation
  // and isn't the current user.
  const candidates = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const existing = new Set(conversation.participantIds);
    return members
      .filter((m) => !existing.has(m.id) && m.id !== currentUser?.id)
      .filter((m) =>
        lower
          ? m.name.toLowerCase().includes(lower) ||
            (m.email ?? "").toLowerCase().includes(lower)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, conversation, currentUser, search]);

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
    setBusy(false);
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      // Resolve each selected member to their canonical Firebase UID
      // before persisting. Selecting a mock-seed or registry id would
      // otherwise stamp a non-canonical id onto participantIds, and the
      // added person's own array-contains snapshot would never see the
      // conversation (the same class of bug resolveToFirebaseUid guards
      // against in getOrCreateDM / createGroupConversation).
      const resolvedIds = await Promise.all(
        Array.from(selected).map((id) => {
          const m = members.find((x) => x.id === id);
          return resolveToFirebaseUid(id, m?.email);
        }),
      );
      const ok = await addParticipants(conversation.id, resolvedIds);
      if (ok) {
        toast.success(
          selected.size === 1
            ? "Added 1 amiga to the chat."
            : `Added ${selected.size} amigas to the chat.`,
        );
        reset();
        onOpenChange(false);
      } else {
        toast.error("Couldn't add those people.");
      }
    } finally {
      setBusy(false);
    }
  }

  const willPromote =
    conversation.type === "dm" && selected.size > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Add to conversation
          </DialogTitle>
          <DialogDescription>
            {willPromote
              ? "Adding people to a 1:1 DM turns it into a group chat."
              : "Pick anyone from the community to add to this chat."}
          </DialogDescription>
        </DialogHeader>

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

        <div className="max-h-72 overflow-y-auto rounded-lg border border-rosa/15 divide-y divide-rosa/10">
          {membersLoading && candidates.length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-3 py-4 text-center text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading amigas...
            </p>
          ) : candidates.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              {search.trim() ? "No amigas match your search." : "No amigas to add."}
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

        <DialogFooter className="sm:justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {selected.size === 0
              ? "Select people to add."
              : `${selected.size} selected`}
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
              onClick={handleAdd}
              disabled={busy || selected.size === 0}
              className="bg-primary text-primary-foreground hover:bg-magenta"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add to conversation"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
