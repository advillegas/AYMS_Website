"use client";

/**
 * Supabase implementation of useChannelChat + useThreadMessages.
 * Mirrors use-firebase-chat.ts exactly (same return shape, optimistic
 * send, geo filter, reactions, polls, posts, threads) so the channel
 * page is byte-for-byte compatible when useSupabaseBackend flips on.
 *
 * Reactions and poll votes are JSONB columns; Firestore's atomic
 * arrayUnion/arrayRemove become read-modify-write against the row we
 * already hold in local state (single-author toggles, low contention).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";
import { ensureSupabaseSession } from "./ensure-session";
import { getUserCoords, haversineDistance, isWithinRadius } from "./geo";
import { useAuth } from "./store";
import { useChannels, type RichChannel } from "./use-channels-store";
import {
  useModeration,
  useModerationSync,
  isMuteActive,
} from "./use-moderation-store";
import { toast } from "sonner";
import type {
  RichMessage,
  PollData,
  CreatePollInput,
  PostMedia,
  GifAttachment,
  EditMessagePatch,
} from "./use-firebase-chat";

interface MessageRow {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  attachments: GifAttachment[] | null;
  reactions: Record<string, string[]> | null;
  poll: PollData | null;
  thread_parent_id: string | null;
  thread_count: number;
  is_post: boolean;
  post_title: string | null;
  post_body: string | null;
  post_media: PostMedia[] | null;
  msg_lat: number | null;
  msg_lng: number | null;
  author_local_visibility: "everyone" | "radius" | null;
  created_at: string | null;
  edited_at: string | null;
}

interface SendOptions {
  attachments?: GifAttachment[];
  threadParentId?: string;
  poll?: PollData;
  post?: { title: string; body: string; media?: PostMedia[] };
}

interface UseChannelChatResult {
  messages: RichMessage[];
  sendMessage: (content: string, opts?: SendOptions) => Promise<string | null>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  editMessage: (messageId: string, patch: EditMessagePatch) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  createPoll: (input: CreatePollInput) => Promise<string | null>;
  voteOnPoll: (messageId: string, optionId: string) => Promise<void>;
  pickWinner: (messageId: string) => Promise<string | null>;
  loading: boolean;
  error: string | null;
  isFirebase: boolean;
}

function rowToMessage(r: MessageRow): RichMessage {
  return {
    id: r.id,
    channelId: r.channel_id,
    userId: r.user_id,
    userName: r.user_name,
    userAvatar: r.user_avatar ?? "",
    content: r.content ?? "",
    attachments: r.attachments ?? undefined,
    reactions: r.reactions ?? {},
    threadParentId: r.thread_parent_id ?? null,
    threadCount: r.thread_count ?? 0,
    poll: r.poll ?? null,
    editedAt: r.edited_at ? new Date(r.edited_at).toISOString() : null,
    msgLat: r.msg_lat ?? undefined,
    msgLng: r.msg_lng ?? undefined,
    authorLocalVisibility: r.author_local_visibility ?? undefined,
    isPost: r.is_post ?? false,
    postTitle: r.post_title ?? undefined,
    postBody: r.post_body ?? undefined,
    postMedia: r.post_media ?? undefined,
    timestamp: r.created_at
      ? new Date(r.created_at).toISOString()
      : new Date().toISOString(),
  };
}

function passesGeoFilter(m: RichMessage, channel: RichChannel | undefined): boolean {
  if (!channel) return true;
  const isGeo =
    channel.isGeoChannel ||
    channel.id === "local" ||
    (channel.geoLocations && channel.geoLocations.length > 0);
  if (!isGeo) return true;
  if (m.msgLat == null || m.msgLng == null) return true;
  const radius =
    channel.geoRadiusMiles ?? useAuth.getState().user?.localRadiusMiles ?? 50;
  if (channel.geoLocations && channel.geoLocations.length > 0) {
    const inAnchor = channel.geoLocations.some(
      (loc) => haversineDistance(loc.lat, loc.lng, m.msgLat!, m.msgLng!) <= radius,
    );
    if (!inAnchor) return false;
    if (m.authorLocalVisibility === "radius") {
      return isWithinRadius(useAuth.getState().user, m.msgLat, m.msgLng, radius);
    }
    return true;
  }
  const viewer = useAuth.getState().user;
  if (!viewer) return true;
  if (
    m.authorLocalVisibility === "radius" &&
    !isWithinRadius(viewer, m.msgLat, m.msgLng, radius)
  ) {
    return false;
  }
  return isWithinRadius(viewer, m.msgLat, m.msgLng, radius);
}

export function useChannelChatSupabase(channelId: string): UseChannelChatResult {
  const user = useAuth((s) => s.user);
  const channels = useChannels((s) => s.channels);

  // Moderation: keep the ban/mute config live here, mirroring
  // use-firebase-chat.ts — the chat surface is mounted everywhere
  // enforcement matters (the module-level guard makes a second mount
  // from the shell a no-op). Client-side defense-in-depth only; RLS
  // is the real server-side backstop.
  useModerationSync();
  const bans = useModeration((s) => s.bans);
  const mutes = useModeration((s) => s.mutes);
  const channel = useMemo(
    () => channels.find((c) => c.id === channelId),
    [channels, channelId],
  );
  const [fbMessages, setFbMessages] = useState<RichMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<RichMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPendingMessages([]);
    const unsub = subscribeQuery<MessageRow>(
      "messages",
      (sb) =>
        sb.from("messages").select("*").eq("channel_id", channelId).limit(200),
      (rows) => {
        const next = rows
          .map(rowToMessage)
          .filter((m) => !m.threadParentId)
          .sort((a, b) => (a.timestamp || "\uffff").localeCompare(b.timestamp || "\uffff"));
        setFbMessages(next);
        setPendingMessages((prev) =>
          prev.filter(
            (p) =>
              !next.some(
                (m) => m.userId === p.userId && m.content === p.content && !m._pending,
              ),
          ),
        );
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      },
      { column: "channel_id", value: channelId },
      `channel:${channelId}`,
    );
    return unsub;
  }, [channelId]);

  const mergedMessages = useMemo(() => {
    // Hide messages authored by banned members alongside the geo
    // filter — the read-side half of enforcement (the write-side
    // early-return lives in sendMessage below).
    const confirmed = fbMessages.filter(
      (m) => !bans[m.userId] && passesGeoFilter(m, channel),
    );
    if (pendingMessages.length === 0) return confirmed;
    return [...confirmed, ...pendingMessages];
  }, [fbMessages, pendingMessages, channel, bans]);

  const sendMessage = useCallback(
    async (content: string, opts: SendOptions = {}): Promise<string | null> => {
      const text = content.trim();
      const hasAttachments = !!opts.attachments && opts.attachments.length > 0;
      const hasPoll = !!opts.poll;
      const hasPost = !!opts.post;
      if (!text && !hasAttachments && !hasPoll && !hasPost) return null;
      if (!user) return null;

      // Enforcement: a banned or actively-muted author can't post.
      // Early-return BEFORE the optimistic insert so nothing flashes
      // on screen, and surface a toast explaining why. (RLS remains
      // the real server-side backstop.)
      if (bans[user.id]) {
        toast.error("You're banned from posting in the community.");
        return null;
      }
      if (isMuteActive(mutes[user.id])) {
        const until = mutes[user.id]?.until;
        toast.error(
          until
            ? `You're muted until ${new Date(until).toLocaleString()}.`
            : "You're muted and can't post right now.",
        );
        return null;
      }

      const sb = getSupabase();
      if (!sb) return null;

      const id = `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const tempId = `pending-${id}`;
      const optimistic: RichMessage = {
        id: tempId,
        channelId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar ?? "",
        content: text,
        attachments: opts.attachments,
        reactions: {},
        threadParentId: opts.threadParentId ?? null,
        threadCount: 0,
        poll: opts.poll ?? null,
        editedAt: null,
        _pending: true,
        timestamp: new Date().toISOString(),
        isPost: hasPost,
        postTitle: opts.post?.title,
        postBody: opts.post?.body,
        postMedia: opts.post?.media,
      };
      if (!opts.threadParentId) {
        setPendingMessages((prev) => [...prev, optimistic]);
      }

      const row: Record<string, unknown> = {
        id,
        channel_id: channelId,
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar ?? "",
        content: text,
        attachments: opts.attachments ?? [],
        reactions: {},
        thread_parent_id: opts.threadParentId ?? null,
        thread_count: 0,
        poll: opts.poll ?? null,
        created_at: new Date().toISOString(),
      };
      const isGeo =
        channelId === "local" ||
        !!channel?.isGeoChannel ||
        (channel?.geoLocations && channel.geoLocations.length > 0);
      if (isGeo) {
        const coords = getUserCoords(user);
        if (coords) {
          row.msg_lat = coords.lat;
          row.msg_lng = coords.lng;
        }
        row.author_local_visibility = user.localChatVisibility ?? "everyone";
      }
      if (hasPost && opts.post) {
        row.is_post = true;
        row.post_title = opts.post.title;
        row.post_body = opts.post.body;
        if (opts.post.media && opts.post.media.length > 0) row.post_media = opts.post.media;
      }

      // Guarantee an authenticated session first — on a lapsed token the
      // insert would run as `anon` and RLS rejects it ("Failed to send").
      await ensureSupabaseSession(sb);
      const { error: insErr } = await sb.from("messages").insert(row);
      if (insErr) {
        console.error("[supabase-chat] send failed", insErr.message);
        setError(insErr.message);
        setPendingMessages((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, _pending: false, _failed: true } : p)),
        );
        toast.error("Couldn't send your message", {
          description: "Check your connection or sign in again, then retry.",
        });
        return null;
      }
      // Keep the optimistic bubble until the confirmed row shows up in a
      // refetch (the subscription's reconcile pass removes it) — dropping
      // it here makes the message vanish whenever realtime lags.
      setPendingMessages((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, _pending: false } : p)),
      );

      if (opts.threadParentId) {
        const parent = fbMessages.find((m) => m.id === opts.threadParentId);
        const nextCount = (parent?.threadCount ?? 0) + 1;
        await sb.from("messages").update({ thread_count: nextCount }).eq("id", opts.threadParentId);
      }
      return id;
    },
    [channelId, user, channel, fbMessages, bans, mutes],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<void> => {
      if (!user) return;
      const sb = getSupabase();
      if (!sb) return;
      const msg = fbMessages.find((m) => m.id === messageId);
      const reactions: Record<string, string[]> = { ...(msg?.reactions ?? {}) };
      const arr = reactions[emoji] ? [...reactions[emoji]] : [];
      const idx = arr.indexOf(user.id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(user.id);
      if (arr.length === 0) delete reactions[emoji];
      else reactions[emoji] = arr;
      await sb.from("messages").update({ reactions }).eq("id", messageId);
    },
    [user, fbMessages],
  );

  const editMessage = useCallback(
    async (messageId: string, patch: EditMessagePatch): Promise<boolean> => {
      if (!user) return false;
      const sb = getSupabase();
      if (!sb) return false;
      // Mirror main's EditMessagePatch contract: a bare string edits
      // `content`; the object form edits post fields too.
      const update: Record<string, unknown> = {
        edited_at: new Date().toISOString(),
      };
      if (typeof patch === "string") {
        const trimmed = patch.trim();
        if (!trimmed) return false;
        update.content = trimmed;
      } else {
        if (patch.content !== undefined) update.content = patch.content;
        if (patch.postTitle !== undefined) update.post_title = patch.postTitle;
        if (patch.postBody !== undefined) update.post_body = patch.postBody;
        if (patch.postMedia !== undefined) update.post_media = patch.postMedia;
        if (Object.keys(update).length === 1) return false; // nothing to change
      }
      const { error: e } = await sb.from("messages").update(update).eq("id", messageId);
      if (e) {
        setError(e.message);
        return false;
      }
      return true;
    },
    [user],
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!user) return false;
      const sb = getSupabase();
      if (!sb) return false;
      const { error: e } = await sb.from("messages").delete().eq("id", messageId);
      if (e) {
        setError(e.message);
        return false;
      }
      return true;
    },
    [user],
  );

  const createPoll = useCallback(
    async (input: CreatePollInput): Promise<string | null> => {
      if (!user) return null;
      const cleaned = input.options.map((o) => o.trim()).filter(Boolean).slice(0, 10);
      if (input.kind === "poll" && cleaned.length < 2) return null;
      if (input.kind === "giveaway" && cleaned.length < 1) return null;
      const poll: PollData = {
        kind: input.kind,
        question: input.question.trim() || "(no question)",
        options: cleaned.map((text, i) => ({
          id: `opt-${i}-${Math.random().toString(36).slice(2, 6)}`,
          text,
        })),
        votes: {},
        multiple: input.kind === "poll" ? !!input.multiple : false,
        closesAt: input.closesAt,
        winnerId: null,
        createdAt: new Date().toISOString(),
      };
      return sendMessage("", { poll });
    },
    [user, sendMessage],
  );

  const voteOnPoll = useCallback(
    async (messageId: string, optionId: string): Promise<void> => {
      if (!user) return;
      const sb = getSupabase();
      if (!sb) return;
      const msg = fbMessages.find((m) => m.id === messageId);
      if (!msg?.poll) return;
      if (msg.poll.closesAt && new Date(msg.poll.closesAt) < new Date()) return;
      const poll: PollData = {
        ...msg.poll,
        votes: { ...(msg.poll.votes ?? {}) },
      };
      const cur = poll.votes[optionId] ? [...poll.votes[optionId]] : [];
      const has = cur.includes(user.id);
      if (has) {
        poll.votes[optionId] = cur.filter((u) => u !== user.id);
      } else {
        poll.votes[optionId] = [...cur, user.id];
        if (!poll.multiple) {
          for (const opt of poll.options) {
            if (opt.id === optionId) continue;
            if ((poll.votes[opt.id] ?? []).includes(user.id)) {
              poll.votes[opt.id] = poll.votes[opt.id].filter((u) => u !== user.id);
            }
          }
        }
      }
      await sb.from("messages").update({ poll }).eq("id", messageId);
    },
    [user, fbMessages],
  );

  const pickWinner = useCallback(
    async (messageId: string): Promise<string | null> => {
      if (!user) return null;
      const sb = getSupabase();
      if (!sb) return null;
      const msg = fbMessages.find((m) => m.id === messageId);
      if (!msg?.poll || msg.poll.kind !== "giveaway") return null;
      const pool = Array.from(new Set(Object.values(msg.poll.votes ?? {}).flat()));
      if (pool.length === 0) return null;
      const winner = pool[Math.floor(Math.random() * pool.length)];
      const poll: PollData = { ...msg.poll, winnerId: winner };
      const { error: e } = await sb.from("messages").update({ poll }).eq("id", messageId);
      if (e) return null;
      return winner;
    },
    [user, fbMessages],
  );

  return {
    messages: mergedMessages,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    createPoll,
    voteOnPoll,
    pickWinner,
    loading,
    error,
    isFirebase: true,
  };
}

export function useThreadMessagesSupabase(parentId: string | null): {
  replies: RichMessage[];
  loading: boolean;
} {
  const [replies, setReplies] = useState<RichMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentId) {
      setReplies([]);
      return;
    }
    setLoading(true);
    const unsub = subscribeQuery<MessageRow>(
      "messages",
      (sb) =>
        sb.from("messages").select("*").eq("thread_parent_id", parentId).limit(100),
      (rows) => {
        setReplies(
          rows.map(rowToMessage).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
        );
        setLoading(false);
      },
      () => setLoading(false),
      { column: "thread_parent_id", value: parentId },
    );
    return unsub;
  }, [parentId]);

  return { replies, loading };
}
