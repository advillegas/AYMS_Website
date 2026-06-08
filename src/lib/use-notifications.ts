"use client";

/**
 * In-app notifications feed.
 *
 * Aggregates events from existing Firestore subscriptions into a
 * single, time-sorted stream the bell button can render:
 *   - DMs and group messages where you're a participant
 *   - @mentions of your name in any channel
 *   - @everyone / @channel pings in any channel
 *   - role pings for roles you're in
 *   - thread replies on messages you authored
 *   - reactions on messages you authored
 *
 * Read state is persisted via Zustand+persist (a single
 * `lastSeenAt` ISO timestamp). A notification with createdAt newer
 * than lastSeenAt counts as unread; everything older is read.
 *
 * Why this design: notifications are derived from messages we
 * already query, so we don't need a parallel "notifications"
 * collection or extra Firestore writes per event. The trade-off is
 * we only see things that arrive while the tab is open (no
 * historical backfill); good enough for MVP, and matches Discord
 * behaviour for in-app bell.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  query,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useAuth } from "./store";
import { useConversations } from "./use-conversations";
import { useUserRoles } from "./use-roles-store";
import { useChannels } from "./use-channels-store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type NotificationType =
  | "dm"
  | "mention"
  | "channel-mention"
  | "role-mention"
  | "thread-reply"
  | "reaction";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  /** Headline shown in bold (e.g. "Aaron mentioned you in #general"). */
  title: string;
  /** Optional body — one or two lines of context. */
  body: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  /** Relative href the bell should navigate to when clicked. */
  href: string;
  /** ISO timestamp the underlying event happened. Drives sort + read state. */
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Read-state store                                                    */
/* ------------------------------------------------------------------ */

interface NotifReadState {
  /** ISO timestamp of the most recent "I saw the bell" moment. */
  lastSeenAt: string;
  /**
   * Per-item read overrides. The derived feed only has a single
   * `lastSeenAt` cursor (good enough for the bell, which marks
   * everything read on close), but the full notification center needs
   * "mark this one read" without touching the others. Ids dismissed
   * here are treated as read even when newer than `lastSeenAt`.
   *
   * Persisted as a plain string[] (Sets aren't JSON-serialisable);
   * rehydrated back into a Set on load. Pruned to the most recent 500
   * ids so it can't grow unbounded.
   */
  readIds: string[];
  markAllRead: () => void;
  /** Mark a single derived notification (by id) as read. */
  markOneRead: (id: string) => void;
}

const READ_IDS_CAP = 500;

export const useNotificationReadState = create<NotifReadState>()(
  persist(
    (set) => ({
      lastSeenAt: new Date(0).toISOString(),
      readIds: [],
      markAllRead: () => set({ lastSeenAt: new Date().toISOString() }),
      markOneRead: (id) =>
        set((s) => {
          if (!id || s.readIds.includes(id)) return s;
          const next = [id, ...s.readIds].slice(0, READ_IDS_CAP);
          return { readIds: next };
        }),
    }),
    {
      name: "ayms-notif-read",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Back-compat: persisted state from before readIds existed simply
      // hydrates with an empty array (lastSeenAt + markAllRead behave
      // exactly as before).
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<NotifReadState>;
        return {
          lastSeenAt: p.lastSeenAt ?? new Date(0).toISOString(),
          readIds: Array.isArray(p.readIds) ? p.readIds : [],
        } as NotifReadState;
      },
    },
  ),
);

/**
 * Back-compatible read-state helper for derived notifications.
 *
 * A derived item counts as read when it's older than the global
 * `lastSeenAt` cursor OR has been individually dismissed via
 * `markOneRead`. Centralised so the bell and the notification center
 * agree on what "read" means.
 */
export function isDerivedNotificationRead(
  item: Pick<NotificationItem, "id" | "createdAt">,
  lastSeenAt: string,
  readIds: Set<string> | string[],
): boolean {
  const ids = Array.isArray(readIds) ? new Set(readIds) : readIds;
  if (ids.has(item.id)) return true;
  return item.createdAt <= lastSeenAt;
}

/* ------------------------------------------------------------------ */
/* Persisted reaction events                                           */
/* ------------------------------------------------------------------ */

/**
 * Reaction notifications get persisted across reloads because reactions
 * themselves don't carry a per-user timestamp - we only know "this
 * (message, emoji, user) tuple existed in the snapshot". If we
 * re-derived "new" reactions on every fresh subscription start, every
 * page refresh would re-surface every historical reaction as if it
 * just happened (with createdAt = now), which is exactly the
 * "stuck at 1 second ago after refresh" behaviour we hit.
 *
 * Each entry is keyed by `${messageId}|${emoji}|${reactorId}` and
 * stamped with the FIRST time we ever observed it. Re-observing the
 * same key never overwrites the timestamp, so the displayed "5 min
 * ago" actually advances correctly.
 *
 * Auto-pruned to 7 days so the store doesn't grow forever.
 */
interface ReactionEvent {
  key: string;
  messageId: string;
  emoji: string;
  reactorId: string;
  channelId: string;
  createdAt: string;
}

interface ReactionEventsState {
  events: Record<string, ReactionEvent>;
  recordNew: (incoming: ReactionEvent[]) => void;
  prune: () => void;
}

const PRUNE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const useReactionEvents = create<ReactionEventsState>()(
  persist(
    (set, get) => ({
      events: {},
      recordNew: (incoming) => {
        if (incoming.length === 0) return;
        set((s) => {
          const next = { ...s.events };
          for (const e of incoming) {
            // Only record if we've never seen this key. Re-observing
            // an existing reaction must NOT bump createdAt or the
            // bell time will drift back to "now" again.
            if (!next[e.key]) next[e.key] = e;
          }
          return { events: next };
        });
      },
      prune: () => {
        const cutoff = Date.now() - PRUNE_AFTER_MS;
        const cur = get().events;
        let changed = false;
        const next: Record<string, ReactionEvent> = {};
        for (const [k, v] of Object.entries(cur)) {
          const t = new Date(v.createdAt).getTime();
          if (Number.isFinite(t) && t >= cutoff) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        if (changed) set({ events: next });
      },
    }),
    {
      name: "ayms-notif-reactions",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Firestore message shape                                             */
/* ------------------------------------------------------------------ */

interface FirestoreMessageDoc {
  channelId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  reactions?: Record<string, string[]>;
  threadParentId?: string | null;
  createdAt?: Timestamp;
}

interface RecentMessage {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  reactions: Record<string, string[]>;
  threadParentId: string | null;
  createdAt: string;
}

function docToMessage(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): RecentMessage | null {
  const data = d.data() as FirestoreMessageDoc;
  if (!data.createdAt) return null;
  return {
    id: d.id,
    channelId: data.channelId,
    userId: data.userId,
    userName: data.userName,
    userAvatar: data.userAvatar ?? "",
    content: data.content ?? "",
    reactions: data.reactions ?? {},
    threadParentId: data.threadParentId ?? null,
    createdAt: data.createdAt.toDate().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Mention detection                                                   */
/* ------------------------------------------------------------------ */

/** Normalize a name to a mention token: lowercase, hyphenated. */
function nameToToken(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/** Build the set of tokens that mean "this is for the current user". */
function buildSelfTokens(args: {
  userName: string | undefined;
  userEmail: string | undefined;
  roleNames: string[];
}): {
  nameTokens: Set<string>;
  roleTokens: Set<string>;
} {
  const nameTokens = new Set<string>();
  if (args.userName) {
    nameTokens.add(nameToToken(args.userName));
    // First name only, e.g. "@aaron" matches "Aaron Villegas".
    const first = args.userName.trim().split(/\s+/)[0];
    if (first) nameTokens.add(first.toLowerCase());
    // Hyphenated full name, e.g. "@aaron-villegas".
    nameTokens.add(args.userName.toLowerCase().replace(/\s+/g, "-"));
  }
  if (args.userEmail) {
    const local = args.userEmail.split("@")[0];
    if (local) nameTokens.add(local.toLowerCase());
  }
  const roleTokens = new Set<string>();
  for (const r of args.roleNames) {
    if (r) roleTokens.add(nameToToken(r));
  }
  return { nameTokens, roleTokens };
}

const MENTION_RE = /@([a-z0-9_-]+)/gi;

interface MentionMatch {
  kind: "name" | "role" | "everyone" | "channel";
}

function extractMentionsFor(
  content: string,
  selfTokens: Set<string>,
  roleTokens: Set<string>,
): MentionMatch[] {
  if (!content) return [];
  const out: MentionMatch[] = [];
  for (const m of content.matchAll(MENTION_RE)) {
    const token = (m[1] ?? "").toLowerCase();
    if (token === "everyone") {
      out.push({ kind: "everyone" });
    } else if (token === "channel" || token === "here") {
      out.push({ kind: "channel" });
    } else if (selfTokens.has(token)) {
      out.push({ kind: "name" });
    } else if (roleTokens.has(token)) {
      out.push({ kind: "role" });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Recent-messages subscription                                        */
/* ------------------------------------------------------------------ */

const RECENT_LIMIT = 200;

function useRecentMessages(): RecentMessage[] {
  const [messages, setMessages] = useState<RecentMessage[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const db = getDb();
    if (!db) return;
    // No orderBy — single-collection queries without a where clause
    // only need auto-created indexes. Sorting client-side avoids a
    // composite-index requirement that would silently fail if not
    // deployed. Same pattern as useConversations and useThreadMessages.
    const q = query(
      collection(db, "messages"),
      limit(RECENT_LIMIT),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: RecentMessage[] = [];
        for (const d of snap.docs) {
          const m = docToMessage(d);
          if (m) next.push(m);
        }
        next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setMessages(next);
      },
      (err: FirestoreError) => {
        console.warn("[notifications] recent messages snapshot failed", err);
      },
    );
    return () => unsub();
  }, []);

  return messages;
}

/* ------------------------------------------------------------------ */
/* Reaction diffing                                                    */
/* ------------------------------------------------------------------ */

/**
 * Walk the recent-messages snapshot and return one tuple per
 * "someone reacted to one of my messages" event.
 *
 * Returns an array of (key, messageId, emoji, reactorId, channelId)
 * so the persistence layer can both diff and reconstruct
 * notifications without re-walking the messages.
 */
interface ReactionTuple {
  key: string;
  messageId: string;
  emoji: string;
  reactorId: string;
  channelId: string;
  /** The message's own timestamp — used as the reaction's createdAt
   * instead of `new Date()` so the notification shows when the
   * message was posted, not when we happened to observe the reaction. */
  messageCreatedAt: string;
}

function reactionTuplesFor(
  messages: RecentMessage[],
  myId: string,
): ReactionTuple[] {
  const out: ReactionTuple[] = [];
  for (const m of messages) {
    if (m.userId !== myId) continue;
    for (const [emoji, ids] of Object.entries(m.reactions)) {
      for (const id of ids) {
        if (id === myId) continue;
        out.push({
          key: `${m.id}|${emoji}|${id}`,
          messageId: m.id,
          emoji,
          reactorId: id,
          channelId: m.channelId,
          messageCreatedAt: m.createdAt,
        });
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Public hook                                                         */
/* ------------------------------------------------------------------ */

export interface UseNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
}

/**
 * Aggregated, time-sorted notification feed for the current user.
 *
 * Notifications are derived live from existing Firestore
 * subscriptions; closing the tab loses the in-memory feed but the
 * underlying source data (DMs, channel messages) is always intact.
 */
export function useNotifications(): UseNotificationsResult {
  const currentUser = useAuth((s) => s.user);
  const recentMessages = useRecentMessages();
  const { conversations } = useConversations();
  const myRoles = useUserRoles(currentUser?.id);
  const channels = useChannels((s) => s.channels);
  const { lastSeenAt, markAllRead } = useNotificationReadState();
  const readIds = useNotificationReadState((s) => s.readIds);
  const reactionEventsMap = useReactionEvents((s) => s.events);
  const recordReactionEvents = useReactionEvents((s) => s.recordNew);
  const pruneReactionEvents = useReactionEvents((s) => s.prune);

  const channelNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of channels) m.set(c.id, c.name);
    return m;
  }, [channels]);

  const selfTokenSets = useMemo(
    () =>
      buildSelfTokens({
        userName: currentUser?.name,
        userEmail: currentUser?.email,
        roleNames: myRoles.map((r) => r.name),
      }),
    [currentUser?.name, currentUser?.email, myRoles],
  );

  // One-shot prune of stale reactions on mount (>7 days old).
  useEffect(() => {
    pruneReactionEvents();
  }, [pruneReactionEvents]);

  // Session-local set of all reaction keys we've observed since page
  // load. The FIRST snapshot seeds this set silently (no notifications
  // fired). Only keys that appear in a SUBSEQUENT snapshot AND aren't
  // in the persisted store get recorded as new notifications. This
  // prevents every historical reaction from resurfacing on refresh.
  const seenReactionKeysRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const tuples = reactionTuplesFor(recentMessages, currentUser.id);
    const currentKeys = new Set(tuples.map((t) => t.key));

    if (seenReactionKeysRef.current === null) {
      // First snapshot after mount: seed silently, don't fire.
      seenReactionKeysRef.current = currentKeys;
      return;
    }

    // Diff: keys in currentKeys that weren't in the previous snapshot
    // AND aren't already persisted.
    const prev = seenReactionKeysRef.current;
    const incoming: ReactionEvent[] = [];
    for (const t of tuples) {
      if (prev.has(t.key)) continue;
      if (reactionEventsMap[t.key]) continue;
      incoming.push({
        key: t.key,
        messageId: t.messageId,
        emoji: t.emoji,
        reactorId: t.reactorId,
        channelId: t.channelId,
        // Use the message's timestamp so the notification shows when
        // the message was posted, not when we observed the reaction.
        // Falls back to now only if the message has no timestamp.
        createdAt: t.messageCreatedAt || new Date().toISOString(),
      });
    }

    // Update the session set to the latest snapshot.
    seenReactionKeysRef.current = currentKeys;

    if (incoming.length > 0) recordReactionEvents(incoming);
    // Deliberately exclude reactionEventsMap from deps to avoid a
    // render loop: recordReactionEvents updates the map, which would
    // re-trigger this effect. The ref-based diff is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentMessages, currentUser]);

  // Hydrate the persisted reaction events into NotificationItems.
  // We resolve actor display info from whichever message is still in
  // the recent feed; falls back gracefully when the message has aged
  // out of the 200-doc window.
  const reactionEvents = useMemo<NotificationItem[]>(() => {
    if (!currentUser) return [];
    const out: NotificationItem[] = [];
    for (const ev of Object.values(reactionEventsMap)) {
      const message = recentMessages.find((m) => m.id === ev.messageId);
      const actor = recentMessages.find((m) => m.userId === ev.reactorId);
      const channelName = channelNameById.get(ev.channelId) ?? "a channel";
      const preview = message
        ? message.content.length > 60
          ? `${message.content.slice(0, 60)}...`
          : message.content || "(attachment)"
        : "your message";
      out.push({
        id: `reaction:${ev.messageId}:${ev.emoji}:${ev.reactorId}`,
        type: "reaction",
        title: `${actor?.userName ?? "Someone"} reacted ${ev.emoji} in #${channelName}`,
        body: preview,
        actorId: ev.reactorId,
        actorName: actor?.userName,
        actorAvatar: actor?.userAvatar,
        href: `/community#msg-${ev.messageId}`,
        createdAt: ev.createdAt,
      });
    }
    return out;
  }, [reactionEventsMap, recentMessages, channelNameById, currentUser]);

  const notifications = useMemo<NotificationItem[]>(() => {
    if (!currentUser) return [];
    const items: NotificationItem[] = [];

    // ------ Channel messages: mentions + thread replies ------
    const myMessageIds = new Set<string>();
    for (const m of recentMessages) {
      if (m.userId === currentUser.id) myMessageIds.add(m.id);
    }
    for (const m of recentMessages) {
      if (m.userId === currentUser.id) continue;
      const channelName = channelNameById.get(m.channelId) ?? "a channel";

      // Thread reply on one of my messages.
      if (m.threadParentId && myMessageIds.has(m.threadParentId)) {
        const preview =
          m.content.length > 80
            ? `${m.content.slice(0, 80)}...`
            : m.content || "(attachment)";
        items.push({
          id: `thread:${m.id}`,
          type: "thread-reply",
          title: `${m.userName} replied in your thread`,
          body: preview,
          actorId: m.userId,
          actorName: m.userName,
          actorAvatar: m.userAvatar,
          href: `/community#msg-${m.threadParentId}`,
          createdAt: m.createdAt,
        });
      }

      // Mention scan — name, role, @everyone, @channel.
      const mentions = extractMentionsFor(
        m.content,
        selfTokenSets.nameTokens,
        selfTokenSets.roleTokens,
      );
      for (const hit of mentions) {
        if (hit.kind === "name") {
          items.push({
            id: `mention:${m.id}`,
            type: "mention",
            title: `${m.userName} mentioned you in #${channelName}`,
            body: m.content.length > 100 ? `${m.content.slice(0, 100)}...` : m.content,
            actorId: m.userId,
            actorName: m.userName,
            actorAvatar: m.userAvatar,
            href: `/community#msg-${m.id}`,
            createdAt: m.createdAt,
          });
          break; // one notification per message even if multi-mentioned
        }
        if (hit.kind === "role") {
          items.push({
            id: `role-mention:${m.id}`,
            type: "role-mention",
            title: `${m.userName} pinged a role you're in (#${channelName})`,
            body: m.content.length > 100 ? `${m.content.slice(0, 100)}...` : m.content,
            actorId: m.userId,
            actorName: m.userName,
            actorAvatar: m.userAvatar,
            href: `/community#msg-${m.id}`,
            createdAt: m.createdAt,
          });
          break;
        }
        if (hit.kind === "everyone" || hit.kind === "channel") {
          items.push({
            id: `${hit.kind}:${m.id}`,
            type: "channel-mention",
            title:
              hit.kind === "everyone"
                ? `${m.userName} pinged @everyone in #${channelName}`
                : `${m.userName} pinged @channel in #${channelName}`,
            body: m.content.length > 100 ? `${m.content.slice(0, 100)}...` : m.content,
            actorId: m.userId,
            actorName: m.userName,
            actorAvatar: m.userAvatar,
            href: `/community#msg-${m.id}`,
            createdAt: m.createdAt,
          });
          break;
        }
      }
    }

    // ------ Direct messages (and group chats) ------
    for (const c of conversations) {
      if (!c.lastMessage) continue;
      if (!c.lastMessage.createdAt) continue;
      if (c.lastMessage.userId === currentUser.id) continue;
      const lastReadByMe = c.readAt?.[currentUser.id];
      if (lastReadByMe === "") continue;
      if (lastReadByMe && lastReadByMe >= c.lastMessage.createdAt) continue;
      const isGroup = c.type === "group";
      const preview =
        c.lastMessage.content.length > 100
          ? `${c.lastMessage.content.slice(0, 100)}...`
          : c.lastMessage.content || "(attachment)";

      // Check if the DM/group message mentions the current user.
      // This catches @name tags inside DMs and group chats which
      // the channel-messages scan can't see (different collection).
      const dmMentions = extractMentionsFor(
        c.lastMessage.content,
        selfTokenSets.nameTokens,
        selfTokenSets.roleTokens,
      );
      const wasMentioned = dmMentions.some(
        (h) => h.kind === "name" || h.kind === "role",
      );
      const wasChannelPing = dmMentions.some(
        (h) => h.kind === "everyone" || h.kind === "channel",
      );

      let title: string;
      let notifType: NotificationType = "dm";
      if (wasMentioned) {
        notifType = "mention";
        title = isGroup
          ? `${c.lastMessage.userName} mentioned you in ${c.name?.trim() || "a group chat"}`
          : `${c.lastMessage.userName} mentioned you in a DM`;
      } else if (wasChannelPing && isGroup) {
        notifType = "channel-mention";
        title = `${c.lastMessage.userName} pinged @everyone in ${c.name?.trim() || "a group chat"}`;
      } else {
        title = isGroup
          ? `${c.lastMessage.userName} in ${c.name?.trim() || "a group"}`
          : `${c.lastMessage.userName} sent you a message`;
      }

      items.push({
        id: `dm:${c.id}:${c.lastMessage.createdAt}`,
        type: notifType,
        title,
        body: preview,
        actorId: c.lastMessage.userId,
        actorName: c.lastMessage.userName,
        href: `/community/messages?c=${encodeURIComponent(c.id)}`,
        createdAt: c.lastMessage.createdAt,
      });
    }

    // Reactions (already accumulated in state).
    items.push(...reactionEvents);

    // De-dup by id and sort newest first.
    const byId = new Map<string, NotificationItem>();
    for (const it of items) byId.set(it.id, it);
    return Array.from(byId.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [
    recentMessages,
    conversations,
    currentUser,
    selfTokenSets,
    channelNameById,
    reactionEvents,
  ]);

  const unreadCount = useMemo(() => {
    if (notifications.length === 0) return 0;
    const dismissed = new Set(readIds);
    let n = 0;
    for (const it of notifications) {
      if (dismissed.has(it.id)) continue;
      if (it.createdAt > lastSeenAt) n += 1;
    }
    return n;
  }, [notifications, lastSeenAt, readIds]);

  return { notifications, unreadCount, markAllRead };
}
