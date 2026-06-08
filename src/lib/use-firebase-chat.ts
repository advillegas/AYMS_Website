"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getUserCoords, haversineDistance, isWithinRadius } from "./geo";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useAuth, useChat as useLocalChat, type Message } from "./store";
import { useChannels, type RichChannel } from "./use-channels-store";
import {
  useModeration,
  useModerationSync,
  isMuteActive,
} from "./use-moderation-store";
import { toast } from "sonner";

export interface GifAttachment {
  type: "gif";
  url: string;
  width: number;
  height: number;
  title?: string;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface PollData {
  kind: "poll" | "giveaway";
  question: string;
  options: PollOption[];
  /** optionId -> userId[]; reactions-style toggle through arrayUnion / arrayRemove */
  votes: Record<string, string[]>;
  /** allow multi-select votes */
  multiple: boolean;
  /** ISO timestamp; after this voting is closed (for giveaways = drawing time) */
  closesAt?: string;
  /** Recorded once a giveaway picks its winner */
  winnerId?: string | null;
  createdAt: string;
}

export interface PostMedia {
  url: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  alt?: string;
}

export interface RichMessage extends Message {
  attachments?: GifAttachment[];
  reactions?: Record<string, string[]>;
  threadParentId?: string | null;
  threadCount?: number;
  poll?: PollData | null;
  editedAt?: string | null;
  /** Local-only: message is being sent, not yet confirmed by server. */
  _pending?: boolean;
  /** Local-only: send failed — show error UI + retry affordance. */
  _failed?: boolean;
  /** Geo: lat/lng of the author at send time (only on geo channels). */
  msgLat?: number;
  msgLng?: number;
  authorLocalVisibility?: "everyone" | "radius";
  /* Bulletin posts - long-form messages with title, body, media. */
  isPost?: boolean;
  postTitle?: string;
  postBody?: string;
  postMedia?: PostMedia[];
}

interface FirestoreMessageDoc {
  channelId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  attachments?: GifAttachment[];
  reactions?: Record<string, string[]>;
  threadParentId?: string | null;
  threadCount?: number;
  poll?: PollData | null;
  msgLat?: number;
  msgLng?: number;
  authorLocalVisibility?: "everyone" | "radius";
  isPost?: boolean;
  postTitle?: string;
  postBody?: string;
  postMedia?: PostMedia[];
  createdAt?: Timestamp;
  editedAt?: Timestamp | null;
}

interface SendOptions {
  attachments?: GifAttachment[];
  threadParentId?: string;
  poll?: PollData;
  /* Bulletin post payload — when present, the message is rendered as
   * an expanded post card both in the chat stream and the dedicated
   * Posts tab. */
  post?: {
    title: string;
    body: string;
    media?: PostMedia[];
  };
}

export interface CreatePollInput {
  kind: "poll" | "giveaway";
  question: string;
  options: string[];
  multiple?: boolean;
  closesAt?: string;
}

/**
 * Patch payload for editMessage. A bare string edits the message
 * `content` (regular chat message). The object form additionally
 * supports bulletin posts, whose visible text lives in
 * `postTitle` / `postBody` rather than `content`.
 */
export type EditMessagePatch =
  | string
  | {
      content?: string;
      postTitle?: string;
      postBody?: string;
      postMedia?: PostMedia[];
    };

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

function docToMessage(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): RichMessage {
  const data = d.data() as FirestoreMessageDoc;
  return {
    id: d.id,
    channelId: data.channelId,
    userId: data.userId,
    userName: data.userName,
    userAvatar: data.userAvatar ?? "",
    content: data.content ?? "",
    attachments: data.attachments,
    reactions: data.reactions ?? {},
    threadParentId: data.threadParentId ?? null,
    // Clamp at 0: an unmatched decrement (legacy reply, double-delete)
    // must never surface a negative "−1 replies" in the UI.
    threadCount: Math.max(0, data.threadCount ?? 0),
    poll: data.poll ?? null,
    editedAt: data.editedAt ? data.editedAt.toDate().toISOString() : null,
    msgLat: data.msgLat,
    msgLng: data.msgLng,
    authorLocalVisibility: data.authorLocalVisibility,
    isPost: data.isPost ?? false,
    postTitle: data.postTitle,
    postBody: data.postBody,
    postMedia: data.postMedia,
    timestamp: data.createdAt
      ? data.createdAt.toDate().toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Geo-channel read filter: a message passes if the author's coords
 * fall within the channel's radius of *any* of its anchor locations.
 *
 * The viewer's location is independent — a member can subscribe to a
 * geo channel for a region they don't live in (e.g. planning a trip)
 * and still see the local conversation.
 *
 * If the channel has no anchors yet, fall back to viewer-radius
 * filtering (legacy `#local` behavior).
 */
function passesGeoFilter(
  m: RichMessage,
  channel: RichChannel | undefined,
): boolean {
  // Non-geo channel — no filter.
  if (!channel) return true;
  const isGeo =
    channel.isGeoChannel || channel.id === "local" ||
    (channel.geoLocations && channel.geoLocations.length > 0);
  if (!isGeo) return true;
  // Messages without coords (legacy or sent before the channel went
  // geo) pass through — better to over-show than to silently drop.
  if (m.msgLat == null || m.msgLng == null) return true;

  const radius =
    channel.geoRadiusMiles ??
    useAuth.getState().user?.localRadiusMiles ??
    50;

  // If the channel has explicit anchors, filter against them.
  if (channel.geoLocations && channel.geoLocations.length > 0) {
    const author = { lat: m.msgLat, lng: m.msgLng };
    const inAnchor = channel.geoLocations.some(
      (loc) =>
        haversineDistance(loc.lat, loc.lng, author.lat, author.lng) <= radius,
    );
    if (!inAnchor) return false;
    // Author privacy: even if their message lands within the
    // anchor zone, respect "radius" preference toward the viewer.
    if (m.authorLocalVisibility === "radius") {
      const viewer = useAuth.getState().user;
      return isWithinRadius(viewer, m.msgLat, m.msgLng, radius);
    }
    return true;
  }

  // No anchors → fall back to viewer-radius filter (legacy #local).
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

/**
 * Subscribes to realtime messages for a channel (top-level only -
 * thread replies are excluded; use useThreadMessages for those).
 */
export function useChannelChat(channelId: string): UseChannelChatResult {
  const user = useAuth((s) => s.user);
  const localMessages = useLocalChat((s) => s.messages);
  const localSend = useLocalChat((s) => s.sendMessage);
  const setActive = useLocalChat((s) => s.setActiveChannel);
  const channels = useChannels((s) => s.channels);

  // Moderation: keep the ban/mute config live here. The chat surface
  // is mounted everywhere enforcement matters, so this is the slice's
  // mount point for the `config/moderation` listener (the module-level
  // guard makes a second mount from the shell a no-op). The store map
  // is the local source of truth for the filter + composer gate below.
  // NOTE: this is client-side defense-in-depth ONLY — Firestore
  // security rules are the real backstop (deny writes from banned/
  // muted uids). See use-moderation-store.ts.
  useModerationSync();
  const bans = useModeration((s) => s.bans);
  const mutes = useModeration((s) => s.mutes);
  const channel = useMemo(
    () => channels.find((c) => c.id === channelId),
    [channels, channelId],
  );

  // Server-confirmed messages from Firestore.
  const [fbMessages, setFbMessages] = useState<RichMessage[]>([]);
  // Optimistic local messages not yet confirmed. Keyed by temp id.
  const [pendingMessages, setPendingMessages] = useState<RichMessage[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setActive(channelId);
      return;
    }
    const db = getDb();
    if (!db) return;

    setLoading(true);
    setError(null);
    setPendingMessages([]);
    const q = query(
      collection(db, "messages"),
      where("channelId", "==", channelId),
      limit(200),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Geo filtering happens downstream in `mergedMessages` so
        // edits to the channel's geoLocations / radius take effect
        // without re-subscribing the snapshot listener.
        const next: RichMessage[] = snap.docs
          .map((d) => docToMessage(d))
          .filter((m) => !m.threadParentId)
          .sort((a, b) => {
            const ta = a.timestamp || "\uffff";
            const tb = b.timestamp || "\uffff";
            return ta.localeCompare(tb);
          });
        setFbMessages(next);
        // Remove any pending messages that now appear in the confirmed
        // list (matched by content + userId since the temp id differs
        // from the Firestore-generated id).
        setPendingMessages((prev) =>
          prev.filter(
            (p) =>
              !next.some(
                (m) =>
                  m.userId === p.userId &&
                  m.content === p.content &&
                  !m._pending,
              ),
          ),
        );
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error("[firebase-chat]", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [channelId, setActive]);

  // Merged view: confirmed messages + pending optimistic messages at
  // the end. Apply the geo filter here (rather than in the snapshot
  // callback) so changes to the channel's anchors/radius take effect
  // immediately without resubscribing.
  const mergedMessages = useMemo(() => {
    const confirmed = fbMessages.filter(
      // Hide messages authored by banned members alongside the geo
      // filter. This is the read-side half of enforcement; the
      // write-side (sendMessage early-return) is below, and Firestore
      // rules are the true server-side backstop.
      (m) => !bans[m.userId] && passesGeoFilter(m, channel),
    );
    if (pendingMessages.length === 0) return confirmed;
    return [...confirmed, ...pendingMessages];
  }, [fbMessages, pendingMessages, channel, bans]);

  const sendMessage = useCallback(
    async (content: string, opts: SendOptions = {}) => {
      const text = content.trim();
      const hasAttachments = !!opts.attachments && opts.attachments.length > 0;
      const hasPoll = !!opts.poll;
      const hasPost = !!opts.post;
      if (!text && !hasAttachments && !hasPoll && !hasPost) {
        return null;
      }
      if (!user) return null;

      // Enforcement: a banned or actively-muted author can't post.
      // We early-return BEFORE the optimistic insert so nothing flashes
      // on screen, and surface a toast explaining why. (Firestore
      // rules remain the real server-side backstop.)
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

      if (!isFirebaseConfigured) {
        localSend(text || (hasPost ? opts.post!.title : "(poll)"));
        return null;
      }
      const db = getDb();
      if (!db) return null;

      // Optimistic local message — appears instantly at the bottom
      // while the server write is in flight.
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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

      try {
        // Attach geo coords on geo channels (legacy `#local` plus any
        // user-created channel with `isGeoChannel`).
        const geoFields: Record<string, unknown> = {};
        const isGeo =
          channelId === "local" ||
          !!channel?.isGeoChannel ||
          (channel?.geoLocations && channel.geoLocations.length > 0);
        if (isGeo) {
          const coords = getUserCoords(user);
          if (coords) {
            geoFields.msgLat = coords.lat;
            geoFields.msgLng = coords.lng;
          }
          geoFields.authorLocalVisibility =
            user.localChatVisibility ?? "everyone";
        }

        // Bulletin post payload — empty fields are dropped so we
        // don't pollute non-post messages with empty strings.
        const postFields: Record<string, unknown> = {};
        if (hasPost && opts.post) {
          postFields.isPost = true;
          postFields.postTitle = opts.post.title;
          postFields.postBody = opts.post.body;
          if (opts.post.media && opts.post.media.length > 0) {
            postFields.postMedia = opts.post.media;
          }
        }

        const docRef = await addDoc(collection(db, "messages"), {
          channelId,
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar ?? "",
          content: text,
          attachments: opts.attachments ?? [],
          reactions: {},
          threadParentId: opts.threadParentId ?? null,
          threadCount: 0,
          poll: opts.poll ?? null,
          createdAt: serverTimestamp(),
          ...geoFields,
          ...postFields,
        });

        // Remove the optimistic message — the snapshot will deliver
        // the real one momentarily.
        setPendingMessages((prev) => prev.filter((p) => p.id !== tempId));

        if (opts.threadParentId) {
          try {
            // Atomic server-side increment — avoids the read-modify-
            // write race that double-counted (or lost) bumps when two
            // replies landed close together, and avoids relying on a
            // possibly-stale local snapshot of the parent's count.
            const parentRef = doc(db, "messages", opts.threadParentId);
            await updateDoc(parentRef, { threadCount: increment(1) });
          } catch (innerErr) {
            console.warn("[firebase-chat] thread count bump failed", innerErr);
          }
        }
        return docRef.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Send failed";
        console.error("[firebase-chat] send failed", err);
        setError(message);
        // Mark the optimistic message as failed so the UI can show
        // an error indicator + retry affordance (Discord-style).
        setPendingMessages((prev) =>
          prev.map((p) =>
            p.id === tempId ? { ...p, _pending: false, _failed: true } : p,
          ),
        );
        return null;
      }
    },
    [channelId, user, localSend, fbMessages, channel, bans, mutes],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!isFirebaseConfigured || !user) return;
      const db = getDb();
      if (!db) return;
      const msg = fbMessages.find((m) => m.id === messageId);
      const userIds = msg?.reactions?.[emoji] ?? [];
      const has = userIds.includes(user.id);
      const ref = doc(db, "messages", messageId);
      try {
        await updateDoc(ref, {
          [`reactions.${emoji}`]: has
            ? arrayRemove(user.id)
            : arrayUnion(user.id),
        });
      } catch (err) {
        console.error("[firebase-chat] reaction failed", err);
      }
    },
    [user, fbMessages],
  );

  /**
   * Edit a message's content. The author is the only one allowed to
   * edit by default; the UI also exposes this to anyone with the
   * `manageMessages` permission so moderators can clean up.
   * Returns true on success, false on validation / write failure.
   */
  const editMessage = useCallback(
    async (messageId: string, patch: EditMessagePatch): Promise<boolean> => {
      if (!isFirebaseConfigured || !user) return false;
      const db = getDb();
      if (!db) return false;

      // Normalize the bare-string form (regular message content edit)
      // into the object form so a single write path handles both.
      const fields =
        typeof patch === "string" ? { content: patch } : patch;

      // Build the Firestore update, trimming each provided field and
      // only writing keys that were actually supplied so we never
      // clobber a post's body when only the title changed (or vice
      // versa).
      const update: Record<string, unknown> = {};
      if (fields.content !== undefined) {
        update.content = fields.content.trim();
      }
      if (fields.postTitle !== undefined) {
        const title = fields.postTitle.trim();
        // A post must keep a title — refuse an empty one rather than
        // silently saving a blank headline.
        if (!title) return false;
        update.postTitle = title;
      }
      if (fields.postBody !== undefined) {
        update.postBody = fields.postBody.trim();
      }
      if (fields.postMedia !== undefined) {
        update.postMedia = fields.postMedia;
      }

      // Nothing to write, or a plain message reduced to empty content.
      const isPlainContentEdit =
        fields.postTitle === undefined &&
        fields.postBody === undefined &&
        fields.postMedia === undefined;
      if (Object.keys(update).length === 0) return false;
      if (isPlainContentEdit && !update.content) return false;

      update.editedAt = serverTimestamp();

      try {
        await updateDoc(doc(db, "messages", messageId), update);
        return true;
      } catch (err) {
        console.error("[firebase-chat] edit failed", err);
        const m = err instanceof Error ? err.message : "Edit failed";
        setError(m);
        return false;
      }
    },
    [user],
  );

  /**
   * Hard-delete a message. We don't soft-delete (no tombstone) because
   * the read side filters by createdAt only and a removed doc just
   * disappears from the live snapshot for everyone.
   *
   * Caller is expected to guard the UI to "own message OR moderator".
   */
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!isFirebaseConfigured || !user) return false;
      const db = getDb();
      if (!db) return false;
      try {
        // Determine whether this message is a thread reply *before*
        // deleting it, so we can keep the parent's threadCount in
        // sync. Top-level messages live in `fbMessages`; replies do
        // not (they're filtered out of the channel snapshot), so fall
        // back to a direct read for those.
        const ref = doc(db, "messages", messageId);
        let parentId: string | null =
          fbMessages.find((m) => m.id === messageId)?.threadParentId ?? null;
        if (!parentId) {
          try {
            const snap = await getDoc(ref);
            parentId =
              (snap.exists()
                ? (snap.data() as FirestoreMessageDoc).threadParentId
                : null) ?? null;
          } catch {
            // Best-effort: if the lookup fails we still delete the
            // message; the count just won't decrement.
          }
        }

        await deleteDoc(ref);

        if (parentId) {
          try {
            // Atomic decrement. Increments (on reply create) and
            // decrements (here) are matched pairs, so the stored count
            // stays accurate; docToMessage additionally clamps the
            // read value at 0 to guard against any legacy/unmatched
            // decrement surfacing a negative count in the UI.
            await updateDoc(doc(db, "messages", parentId), {
              threadCount: increment(-1),
            });
          } catch (innerErr) {
            console.warn(
              "[firebase-chat] thread count decrement failed",
              innerErr,
            );
          }
        }
        return true;
      } catch (err) {
        console.error("[firebase-chat] delete failed", err);
        const m = err instanceof Error ? err.message : "Delete failed";
        setError(m);
        return false;
      }
    },
    [user, fbMessages],
  );

  const createPoll = useCallback(
    async (input: CreatePollInput): Promise<string | null> => {
      if (!user) return null;
      const cleanedOptions = input.options
        .map((o) => o.trim())
        .filter(Boolean)
        .slice(0, 10);
      if (input.kind === "poll" && cleanedOptions.length < 2) return null;
      if (input.kind === "giveaway" && cleanedOptions.length < 1) return null;

      const poll: PollData = {
        kind: input.kind,
        question: input.question.trim() || "(no question)",
        options: cleanedOptions.map((text, i) => ({
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
    async (messageId: string, optionId: string) => {
      if (!isFirebaseConfigured || !user) return;
      const db = getDb();
      if (!db) return;
      const msg = fbMessages.find((m) => m.id === messageId);
      if (!msg?.poll) return;
      // Closed?
      if (msg.poll.closesAt && new Date(msg.poll.closesAt) < new Date()) return;

      const ref = doc(db, "messages", messageId);
      const cur = msg.poll.votes?.[optionId] ?? [];
      const has = cur.includes(user.id);
      const update: Record<string, unknown> = {
        [`poll.votes.${optionId}`]: has
          ? arrayRemove(user.id)
          : arrayUnion(user.id),
      };
      // Single-choice polls: remove the vote from any other option.
      if (!msg.poll.multiple && !has) {
        for (const opt of msg.poll.options) {
          if (opt.id === optionId) continue;
          if ((msg.poll.votes?.[opt.id] ?? []).includes(user.id)) {
            update[`poll.votes.${opt.id}`] = arrayRemove(user.id);
          }
        }
      }
      try {
        await updateDoc(ref, update);
      } catch (err) {
        console.error("[firebase-chat] poll vote failed", err);
      }
    },
    [user, fbMessages],
  );

  const pickWinner = useCallback(
    async (messageId: string): Promise<string | null> => {
      if (!isFirebaseConfigured || !user) return null;
      const db = getDb();
      if (!db) return null;
      const msg = fbMessages.find((m) => m.id === messageId);
      if (!msg?.poll || msg.poll.kind !== "giveaway") return null;
      // Pool: union of all userIds across all options.
      const pool = Array.from(
        new Set(Object.values(msg.poll.votes ?? {}).flat()),
      );
      if (pool.length === 0) return null;
      const winner = pool[Math.floor(Math.random() * pool.length)];
      try {
        await updateDoc(doc(db, "messages", messageId), {
          "poll.winnerId": winner,
        });
        return winner;
      } catch (err) {
        console.error("[firebase-chat] pick winner failed", err);
        return null;
      }
    },
    [user, fbMessages],
  );

  if (!isFirebaseConfigured) {
    const filtered = localMessages.filter((m) => m.channelId === channelId);
    return {
      messages: filtered,
      sendMessage,
      toggleReaction,
      editMessage,
      deleteMessage,
      createPoll,
      voteOnPoll,
      pickWinner,
      loading: false,
      error: null,
      isFirebase: false,
    };
  }

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

/**
 * Realtime subscription to a single thread's replies. Sorted client-
 * side so the query only needs a single-field equality index (which
 * Firestore auto-creates), not the composite index that
 * `where + orderBy` would otherwise demand. Avoiding the composite
 * matters: deploying indexes is a separate manual step and a missing
 * one makes the snapshot listener silently fail to fire on updates -
 * which is why thread replies looked like they only appeared on
 * full page refresh before this change.
 */
export function useThreadMessages(parentId: string | null): {
  replies: RichMessage[];
  loading: boolean;
} {
  const [replies, setReplies] = useState<RichMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentId || !isFirebaseConfigured) {
      setReplies([]);
      return;
    }
    const db = getDb();
    if (!db) return;
    setLoading(true);
    const q = query(
      collection(db, "messages"),
      where("threadParentId", "==", parentId),
      limit(100),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => docToMessage(d))
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        setReplies(list);
        setLoading(false);
      },
      (err) => {
        console.error("[firebase-chat thread]", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [parentId]);

  return { replies, loading };
}
