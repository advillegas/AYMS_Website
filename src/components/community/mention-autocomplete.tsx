"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCommunity, type User } from "@/lib/store";
import { useCommunityMembers } from "@/lib/use-community-members";
import { AtSign, Megaphone, Users } from "lucide-react";
import { cn, initials } from "@/lib/utils";

/**
 * Mention autocomplete primitives + UI for the chat composer.
 *
 * Usage: pair useMentionAutocomplete with a textarea ref. The hook
 * inspects the value + caret position, exposes a `query` (the partial
 * token after @) plus the open state. The MentionList component
 * renders the dropdown - the consumer wires keyboard nav and the
 * insert callback.
 *
 * Multi-word names: the token detector now allows spaces inside the
 * @-token so typing "@maria gar" matches "Maria Garcia". The token
 * runs from @ until either a newline, a double-space, or certain
 * punctuation that would never be in a name (like `;`, `:`, `!`).
 *
 * Duplicate disambiguation: the display text is the slugified full
 * name (e.g. "maria-garcia") so two Marias insert different tokens
 * that the message-content renderer can resolve unambiguously.
 */

export interface MentionItem {
  id: string;
  /** Text inserted into the composer (without the leading @). Uses
   * the hyphenated full name so duplicates are distinguishable. */
  display: string;
  /** Human-readable label shown in the dropdown. */
  label: string;
  hint?: string;
  kind: "user" | "everyone" | "channel";
  avatar?: string;
}

export interface MentionState {
  open: boolean;
  query: string;
  tokenStart: number;
  tokenEnd: number;
}

const NULL_STATE: MentionState = {
  open: false,
  query: "",
  tokenStart: -1,
  tokenEnd: -1,
};

/**
 * Walk backwards from the caret to find an in-progress @-token.
 *
 * The token is a single CONTIGUOUS run after the @ (no spaces) — like
 * Slack/Discord. This is what makes tagging reliable: as soon as the user
 * types a space (e.g. finishes the mention and continues their message, or
 * after picking from the list which inserts a hyphenated slug + space), the
 * token closes instead of swallowing the rest of the message and showing a
 * permanent "No matches". The @ must be at start-of-input or after
 * whitespace so we don't trigger on email addresses.
 */
function detectToken(value: string, caret: number): MentionState {
  if (caret <= 0) return NULL_STATE;
  let i = caret - 1;
  while (i >= 0) {
    const ch = value[i];
    if (ch === "@") {
      // Must be preceded by start-of-input or whitespace.
      if (i > 0 && !/\s/.test(value[i - 1])) return NULL_STATE;
      return {
        open: true,
        query: value.slice(i + 1, caret),
        tokenStart: i,
        tokenEnd: caret,
      };
    }
    // Any whitespace or sentence punctuation ends the contiguous token.
    if (/\s/.test(ch) || /[;:!?,]/.test(ch)) return NULL_STATE;
    i--;
  }
  return NULL_STATE;
}

export function useMentionAutocomplete(
  value: string,
  caretPos: number,
): MentionState {
  return useMemo(() => detectToken(value, caretPos), [value, caretPos]);
}

interface MentionListProps {
  query: string;
  highlightedIndex: number;
  onHighlightChange: (idx: number) => void;
  onSelect: (item: MentionItem) => void;
  onLengthChange?: (len: number) => void;
}

const SPECIAL_ITEMS: MentionItem[] = [
  {
    id: "everyone",
    display: "everyone",
    label: "@everyone",
    hint: "Notify everyone in the channel",
    kind: "everyone",
  },
  {
    id: "channel",
    display: "channel",
    label: "@channel",
    hint: "Notify everyone currently online",
    kind: "channel",
  },
];

/** Slug a full name: "Maria Garcia" -> "maria-garcia". Used both
 * as the inserted token and by message-content.tsx to resolve. */
function slugName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/** Strip to lowercase alphanumerics so "Amanda Cabrera", "amanda-cabrera"
 *  and "amandacabrera" all compare equal — the query may arrive as a
 *  partial name, a hyphenated slug, or anything in between. */
function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** True when `name`/`email` should surface for the typed mention `query`. */
function matchesMention(
  name: string,
  email: string | undefined,
  query: string,
): boolean {
  const nq = normalizeForMatch(query);
  if (!nq) return true;
  return (
    normalizeForMatch(name).includes(nq) ||
    normalizeForMatch(email ?? "").includes(nq)
  );
}

export function MentionList({
  query,
  highlightedIndex,
  onHighlightChange,
  onSelect,
  onLengthChange,
}: MentionListProps) {
  // Prefer the live Firestore members; fall back to mock store.
  const { members: liveMembers } = useCommunityMembers();
  const mockMembers = useCommunity((s) => s.members);
  const pool = liveMembers.length > 0 ? liveMembers : mockMembers;
  const lowerQ = query.toLowerCase();

  const items: MentionItem[] = useMemo(() => {
    const memberItems: MentionItem[] = pool
      .filter((m) => matchesMention(m.name, m.email, query))
      .slice(0, 12)
      .map((m) => ({
        id: m.id,
        display: slugName(m.name),
        label: m.name,
        hint: m.role ?? ("email" in m ? (m as User).email : ""),
        avatar: m.avatar,
        kind: "user" as const,
      }));

    // Disambiguate: if two members share the same slug (same full
    // name, different ids), append a short id suffix so the user
    // can tell them apart.
    const slugCount = new Map<string, number>();
    for (const mi of memberItems) {
      slugCount.set(mi.display, (slugCount.get(mi.display) ?? 0) + 1);
    }
    for (const mi of memberItems) {
      if ((slugCount.get(mi.display) ?? 0) > 1) {
        const suffix = mi.id.slice(-4);
        mi.display = `${mi.display}-${suffix}`;
      }
    }

    const specials = SPECIAL_ITEMS.filter((s) =>
      lowerQ ? s.display.startsWith(lowerQ) : true,
    );

    return [...specials, ...memberItems];
  }, [lowerQ, query, pool]);

  useEffect(() => {
    onLengthChange?.(items.length);
  }, [items.length, onLengthChange]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-rosa/30 bg-card shadow-2xl px-3 py-2 text-xs text-muted-foreground">
        No matches for &quot;{query}&quot;
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-rosa/30 bg-card shadow-2xl py-1 max-h-64 overflow-y-auto min-w-[260px]"
      role="listbox"
    >
      {items.map((item, i) => {
        const active = i === highlightedIndex;
        const Icon =
          item.kind === "everyone"
            ? Megaphone
            : item.kind === "channel"
              ? Users
              : AtSign;
        return (
          <button
            key={`${item.kind}-${item.id}`}
            type="button"
            role="option"
            aria-selected={active}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
            onMouseEnter={() => onHighlightChange(i)}
            className={cn(
              "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "hover:bg-primary/8 text-foreground/85",
            )}
          >
            {item.kind === "user" ? (
              <Avatar className="h-6 w-6 shrink-0">
                {item.avatar && (
                  <AvatarImage src={item.avatar} alt={item.label} />
                )}
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/30 to-rosa/40 text-primary font-semibold">
                  {initials(item.label)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span
                className={cn(
                  "h-6 w-6 shrink-0 rounded-full grid place-items-center",
                  item.kind === "everyone"
                    ? "bg-coral/20 text-coral"
                    : "bg-blush/30 text-primary",
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
            )}
            <span className="flex-1 min-w-0">
              <span className="block truncate text-sm font-medium">
                {item.label}
              </span>
              {item.hint && (
                <span className="block truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  {item.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function getMentionItems(
  members: Array<{ id: string; name: string; email?: string; role?: string; avatar?: string }>,
  query: string,
): MentionItem[] {
  const lowerQ = query.toLowerCase();
  const memberItems: MentionItem[] = members
    .filter((m) => matchesMention(m.name, m.email, query))
    .slice(0, 12)
    .map((m) => ({
      id: m.id,
      display: slugName(m.name),
      label: m.name,
      hint: m.role ?? m.email ?? "",
      avatar: m.avatar,
      kind: "user" as const,
    }));

  const slugCount = new Map<string, number>();
  for (const mi of memberItems) {
    slugCount.set(mi.display, (slugCount.get(mi.display) ?? 0) + 1);
  }
  for (const mi of memberItems) {
    if ((slugCount.get(mi.display) ?? 0) > 1) {
      mi.display = `${mi.display}-${mi.id.slice(-4)}`;
    }
  }

  const specials = SPECIAL_ITEMS.filter((s) =>
    lowerQ ? s.display.startsWith(lowerQ) : true,
  );
  return [...specials, ...memberItems];
}

/**
 * Helper: rewrite a value+caret pair to insert a mention at the
 * detected token. Returns the new value and where the caret should
 * land afterwards.
 */
export function applyMention(
  value: string,
  state: MentionState,
  item: MentionItem,
): { value: string; caret: number } {
  const before = value.slice(0, state.tokenStart);
  const after = value.slice(state.tokenEnd);
  const insert = `@${item.display} `;
  return {
    value: before + insert + after,
    caret: before.length + insert.length,
  };
}

export function useCaretPosition(
  ref: React.RefObject<HTMLTextAreaElement | null>,
): [number, () => void] {
  const [caret, setCaret] = useState(0);
  const sync = () => {
    const el = ref.current;
    if (el) setCaret(el.selectionStart);
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => sync();
    el.addEventListener("keyup", handler);
    el.addEventListener("click", handler);
    el.addEventListener("focus", handler);
    return () => {
      el.removeEventListener("keyup", handler);
      el.removeEventListener("click", handler);
      el.removeEventListener("focus", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [caret, sync];
}
