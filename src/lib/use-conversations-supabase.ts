"use client";

/**
 * Supabase implementations for the DM / group-chat layer. Delegated to
 * from use-conversations.ts when useSupabaseBackend is on. Same exported
 * shapes; conversations live in public.conversations and messages in
 * public.conversation_messages (FK + cascade).
 *
 * JSONB fields (last_message, read_at, typing, reactions) are updated
 * read-modify-write against the row we already hold, mirroring the
 * Firestore field-path writes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery, nowIso } from "./supabase-helpers";
import { useAuth } from "./store";
import {
  dmConversationId,
  canSendDM,
  TYPING_FRESH_MS,
  type Conversation,
  type ConversationType,
  type DMMessage,
  type DMSendOptions,
  type UseConversationsResult,
  type UseConversationMessagesResult,
  type DMCheckResult,
} from "./use-conversations";
import { useDMPrefs } from "./use-dm-prefs";
import type { GifAttachment } from "./use-firebase-chat";

interface ConvRow {
  id: string;
  type: string;
  participant_ids: string[];
  created_by: string;
  name: string | null;
  last_message: {
    content: string;
    userId: string;
    userName: string;
    createdAt: string;
  } | null;
  read_at: Record<string, string> | null;
  typing: Record<string, string> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ConvMsgRow {
  id: string;
  conversation_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  attachments: GifAttachment[] | null;
  reactions: Record<string, string[]> | null;
  thread_parent_id: string | null;
  thread_count: number;
  created_at: string | null;
  edited_at: string | null;
}

function rowToConversation(r: ConvRow): Conversation {
  return {
    id: r.id,
    type: r.type as ConversationType,
    participantIds: r.participant_ids ?? [],
    createdBy: r.created_by,
    name: r.name ?? undefined,
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
    lastMessage: r.last_message
      ? {
          content: r.last_message.content,
          userId: r.last_message.userId,
          userName: r.last_message.userName,
          createdAt: r.last_message.createdAt ?? "",
        }
      : undefined,
    readAt: r.read_at ?? undefined,
    typing: r.typing ?? undefined,
  };
}

function rowToDMMessage(r: ConvMsgRow): DMMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    userId: r.user_id,
    userName: r.user_name,
    userAvatar: r.user_avatar ?? "",
    content: r.content ?? "",
    attachments: r.attachments ?? undefined,
    reactions: r.reactions ?? {},
    timestamp: r.created_at ?? "",
    editedAt: r.edited_at ?? null,
    threadParentId: r.thread_parent_id ?? null,
    threadCount: r.thread_count ?? 0,
  };
}

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ----------------------------- list ----------------------------- */

export function useConversationsSupabase(): UseConversationsResult {
  const userId = useAuth((s) => s.user?.id);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeQuery<ConvRow>(
      "conversations",
      (sb) =>
        sb
          .from("conversations")
          .select("*")
          .contains("participant_ids", [userId])
          .limit(100),
      (rows) => {
        setConversations(
          rows
            .map(rowToConversation)
            .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
        );
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      },
    );
    return unsub;
  }, [userId]);

  return { conversations, loading, error, isFirebase: true };
}

/* -------------------------- messages --------------------------- */

export function useConversationMessagesSupabase(
  conversationId: string | null,
): UseConversationMessagesResult {
  const user = useAuth((s) => s.user);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(conversationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      return;
    }
    const unsub = subscribeQuery<ConvRow>(
      "conversations",
      (sb) => sb.from("conversations").select("*").eq("id", conversationId).limit(1),
      (rows) => setConversation(rows[0] ? rowToConversation(rows[0]) : null),
      undefined,
      { column: "id", value: conversationId },
    );
    return unsub;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeQuery<ConvMsgRow>(
      "conversation_messages",
      (sb) =>
        sb
          .from("conversation_messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .limit(200),
      (rows) => {
        setMessages(
          rows
            .map(rowToDMMessage)
            .filter((m) => !m.threadParentId)
            .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || "")),
        );
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      },
      { column: "conversation_id", value: conversationId },
    );
    return unsub;
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string, opts: DMSendOptions = {}): Promise<string | null> => {
      const text = content.trim();
      const hasAttachments = !!opts.attachments && opts.attachments.length > 0;
      if (!text && !hasAttachments) return null;
      if (!user || !conversationId) return null;
      const sb = getSupabase();
      if (!sb) return null;
      const id = genId("dmsg");
      const ts = nowIso();
      const { error: e } = await sb.from("conversation_messages").insert({
        id,
        conversation_id: conversationId,
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar ?? "",
        content: text,
        attachments: opts.attachments ?? [],
        reactions: {},
        thread_parent_id: opts.threadParentId ?? null,
        thread_count: 0,
        created_at: ts,
      });
      if (e) {
        setError(e.message);
        return null;
      }
      if (opts.threadParentId) {
        const parent = messages.find((m) => m.id === opts.threadParentId);
        await sb
          .from("conversation_messages")
          .update({ thread_count: (parent?.threadCount ?? 0) + 1 })
          .eq("id", opts.threadParentId);
      }
      const readAt = { ...(conversation?.readAt ?? {}), [user.id]: ts };
      await sb
        .from("conversations")
        .update({
          updated_at: ts,
          last_message: {
            content: text || "(attachment)",
            userId: user.id,
            userName: user.name,
            createdAt: ts,
          },
          read_at: readAt,
        })
        .eq("id", conversationId);
      return id;
    },
    [conversationId, user, messages, conversation],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user || !conversationId) return;
      const sb = getSupabase();
      if (!sb) return;
      const msg = messages.find((m) => m.id === messageId);
      const reactions: Record<string, string[]> = { ...(msg?.reactions ?? {}) };
      const arr = reactions[emoji] ? [...reactions[emoji]] : [];
      const i = arr.indexOf(user.id);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(user.id);
      if (arr.length === 0) delete reactions[emoji];
      else reactions[emoji] = arr;
      await sb.from("conversation_messages").update({ reactions }).eq("id", messageId);
    },
    [conversationId, user, messages],
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string): Promise<boolean> => {
      if (!user || !conversationId) return false;
      const trimmed = newContent.trim();
      if (!trimmed) return false;
      const sb = getSupabase();
      if (!sb) return false;
      const { error: e } = await sb
        .from("conversation_messages")
        .update({ content: trimmed, edited_at: nowIso() })
        .eq("id", messageId);
      if (e) {
        setError(e.message);
        return false;
      }
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.id === messageId && conversation?.lastMessage) {
        await sb
          .from("conversations")
          .update({
            last_message: { ...conversation.lastMessage, content: trimmed },
          })
          .eq("id", conversationId);
      }
      return true;
    },
    [conversationId, user, messages, conversation],
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!user || !conversationId) return false;
      const sb = getSupabase();
      if (!sb) return false;
      const { error: e } = await sb
        .from("conversation_messages")
        .delete()
        .eq("id", messageId);
      if (e) {
        setError(e.message);
        return false;
      }
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === messages.length - 1) {
        const prev = messages[idx - 1];
        await sb
          .from("conversations")
          .update({
            last_message: prev
              ? {
                  content: prev.content || "(attachment)",
                  userId: prev.userId,
                  userName: prev.userName,
                  createdAt: nowIso(),
                }
              : null,
          })
          .eq("id", conversationId);
      }
      return true;
    },
    [conversationId, user, messages],
  );

  const markAsRead = useCallback(async () => {
    if (!user || !conversationId) return;
    if (!conversation?.lastMessage) return;
    if (conversation.lastMessage.userId === user.id) return;
    const lastRead = conversation.readAt?.[user.id];
    if (lastRead && lastRead >= conversation.lastMessage.createdAt) return;
    const sb = getSupabase();
    if (!sb) return;
    const readAt = { ...(conversation.readAt ?? {}), [user.id]: nowIso() };
    await sb.from("conversations").update({ read_at: readAt }).eq("id", conversationId);
  }, [conversationId, user, conversation]);

  return {
    messages,
    conversation,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    markAsRead,
    loading,
    error,
  };
}

/* -------------------------- mutations -------------------------- */

export async function resolveToFirebaseUidSupabase(
  candidateId: string,
  candidateEmail?: string,
): Promise<string> {
  const sb = getSupabase();
  if (!sb) return candidateId;
  try {
    const { data } = await sb.from("users").select("id").eq("id", candidateId).maybeSingle();
    if (data) return candidateId;
  } catch {
    /* fall through */
  }
  if (!candidateEmail) return candidateId;
  try {
    const { data } = await sb
      .from("users")
      .select("id")
      .eq("email", candidateEmail.toLowerCase().trim())
      .limit(1)
      .maybeSingle();
    if (data) return (data as { id: string }).id;
  } catch {
    /* ignore */
  }
  return candidateId;
}

export async function fetchDMPrivacySupabase(
  otherUserId: string,
): Promise<"anyone" | "friends" | "none"> {
  const sb = getSupabase();
  if (!sb) return "anyone";
  try {
    const { data } = await sb
      .from("users")
      .select("dm_privacy")
      .eq("id", otherUserId)
      .maybeSingle();
    if (!data) return "anyone";
    return ((data as { dm_privacy?: "anyone" | "friends" | "none" }).dm_privacy) ?? "anyone";
  } catch {
    return "anyone";
  }
}

export async function getOrCreateDMSupabase(
  currentUserId: string,
  otherUserId: string,
  options: { friendIds?: Set<string>; otherEmail?: string } = {},
): Promise<{ id: string | null; error?: DMCheckResult }> {
  const sb = getSupabase();
  if (!sb) return { id: null, error: { ok: false, reason: "Supabase unavailable." } };
  const resolvedOtherId = await resolveToFirebaseUidSupabase(
    otherUserId,
    options.otherEmail,
  );
  if (currentUserId === resolvedOtherId) {
    return {
      id: null,
      error: canSendDM({
        currentUserId,
        otherUserId: resolvedOtherId,
        recipientPrivacy: "anyone",
        friendIds: options.friendIds ?? new Set(),
      }),
    };
  }
  const recipientPrivacy = await fetchDMPrivacySupabase(resolvedOtherId);
  const check = canSendDM({
    currentUserId,
    otherUserId: resolvedOtherId,
    recipientPrivacy,
    friendIds: options.friendIds ?? new Set(),
  });
  if (!check.ok) return { id: null, error: check };

  // Atomic find-or-create keyed on the participant set (see the
  // get_or_create_conversation RPC). This collapses any prior thread
  // between these two members regardless of how its id was minted, and
  // the advisory lock prevents two tabs racing into parallel DMs. The
  // deterministic dmConversationId is passed only as the id for a
  // brand-new row.
  const participantIds = [currentUserId, resolvedOtherId].sort();
  try {
    const { data, error: e } = await sb.rpc("get_or_create_conversation", {
      p_id: dmConversationId(currentUserId, resolvedOtherId),
      p_ids: participantIds,
      p_type: "dm",
      p_name: null,
    });
    if (e || !data) {
      return {
        id: null,
        error: { ok: false, reason: e?.message ?? "Couldn't open the conversation." },
      };
    }
    return { id: data as string };
  } catch (err) {
    return {
      id: null,
      error: {
        ok: false,
        reason: err instanceof Error ? err.message : "Couldn't open the conversation.",
      },
    };
  }
}

export async function createGroupConversationSupabase(
  currentUserId: string,
  participantIds: string[],
  options: { name?: string } = {},
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const all = Array.from(new Set([currentUserId, ...participantIds])).sort();
  if (all.length < 2) return null;
  // Same atomic find-or-create as DMs: a group whose member set already
  // exists returns the existing thread instead of spawning a duplicate
  // (the user's "same members → same group" rule). A 2-person set is a
  // DM; anything larger is a group.
  const { data, error: e } = await sb.rpc("get_or_create_conversation", {
    p_id: genId("grp"),
    p_ids: all,
    p_type: all.length > 2 ? "group" : "dm",
    p_name: options.name?.trim() || null,
  });
  if (e || !data) {
    console.error("[createGroupConversation:sb]", e?.message);
    return null;
  }
  return data as string;
}

export async function addParticipantsSupabase(
  conversationId: string,
  newUserIds: string[],
): Promise<boolean> {
  if (newUserIds.length === 0) return false;
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb
    .from("conversations")
    .select("participant_ids,type")
    .eq("id", conversationId)
    .maybeSingle();
  if (!data) return false;
  const row = data as { participant_ids: string[]; type: string };
  const existing = new Set(row.participant_ids ?? []);
  const filtered = newUserIds.filter((id) => !existing.has(id));
  if (filtered.length === 0) return true;
  const merged = Array.from(new Set([...(row.participant_ids ?? []), ...filtered])).sort();
  const { error: e } = await sb
    .from("conversations")
    .update({
      participant_ids: merged,
      type: merged.length > 2 ? "group" : row.type,
      updated_at: nowIso(),
    })
    .eq("id", conversationId);
  return !e;
}

export async function leaveConversationSupabase(
  conversationId: string,
  currentUserId: string,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb
    .from("conversations")
    .select("participant_ids,type")
    .eq("id", conversationId)
    .maybeSingle();
  if (!data) return false;
  const row = data as { participant_ids: string[]; type: string };
  if (row.type === "dm") {
    const { error: e } = await sb.from("conversations").delete().eq("id", conversationId);
    return !e;
  }
  const next = (row.participant_ids ?? []).filter((id) => id !== currentUserId);
  if (next.length === 0) {
    const { error: e } = await sb.from("conversations").delete().eq("id", conversationId);
    return !e;
  }
  const { error: e } = await sb
    .from("conversations")
    .update({ participant_ids: next, updated_at: nowIso() })
    .eq("id", conversationId);
  return !e;
}

export async function renameConversationSupabase(
  conversationId: string,
  newName: string,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error: e } = await sb
    .from("conversations")
    .update({ name: newName.trim() || null, updated_at: nowIso() })
    .eq("id", conversationId);
  return !e;
}

/* --------------------------- typing ---------------------------- */

const TYPING_THROTTLE_MS = 2_500;

async function writeTypingSupabase(
  conversationId: string,
  userId: string,
  isTyping: boolean,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data } = await sb
      .from("conversations")
      .select("typing")
      .eq("id", conversationId)
      .maybeSingle();
    const typing: Record<string, string> = {
      ...((data as { typing?: Record<string, string> } | null)?.typing ?? {}),
    };
    if (isTyping) typing[userId] = nowIso();
    else delete typing[userId];
    await sb.from("conversations").update({ typing }).eq("id", conversationId);
  } catch (err) {
    console.warn("[typing:sb] write failed", err);
  }
}

export function useTypingPublisherSupabase(conversationId: string | null): {
  notifyTyping: (stillTyping: boolean) => void;
} {
  const userId = useAuth((s) => s.user?.id);
  const lastWriteRef = useRef<number>(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      if (isTypingRef.current && conversationId && userId) {
        void writeTypingSupabase(conversationId, userId, false);
        isTypingRef.current = false;
      }
    };
  }, [conversationId, userId]);

  const notifyTyping = useCallback(
    (stillTyping: boolean) => {
      if (!conversationId || !userId) return;
      if (!stillTyping) {
        if (stopTimerRef.current) {
          clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
        if (isTypingRef.current) {
          isTypingRef.current = false;
          void writeTypingSupabase(conversationId, userId, false);
        }
        return;
      }
      const now = Date.now();
      if (now - lastWriteRef.current >= TYPING_THROTTLE_MS) {
        lastWriteRef.current = now;
        isTypingRef.current = true;
        void writeTypingSupabase(conversationId, userId, true);
      }
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(() => {
        if (isTypingRef.current && conversationId && userId) {
          isTypingRef.current = false;
          void writeTypingSupabase(conversationId, userId, false);
        }
      }, TYPING_FRESH_MS);
    },
    [conversationId, userId],
  );

  return { notifyTyping };
}

/* ----------------------- thread replies ------------------------ */

export function useConversationThreadRepliesSupabase(
  conversationId: string | null,
  parentId: string | null,
): { replies: DMMessage[]; loading: boolean } {
  const [replies, setReplies] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId || !parentId) {
      setReplies([]);
      return;
    }
    setLoading(true);
    const unsub = subscribeQuery<ConvMsgRow>(
      "conversation_messages",
      (sb) =>
        sb
          .from("conversation_messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .eq("thread_parent_id", parentId)
          .limit(100),
      (rows) => {
        setReplies(
          rows.map(rowToDMMessage).sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || "")),
        );
        setLoading(false);
      },
      () => setLoading(false),
      { column: "conversation_id", value: conversationId },
    );
    return unsub;
  }, [conversationId, parentId]);

  return { replies, loading };
}

// Re-export so use-conversations can pull the muted map without a cycle.
export { useDMPrefs };
