"use client";

/**
 * Direct messages + group messages.
 *
 * Firestore data model
 * --------------------
 *   conversations/{conversationId}
 *     - type: "dm" | "group"
 *     - participantIds: string[] (sorted lexicographically)
 *     - createdBy: uid
 *     - createdAt, updatedAt: Timestamp
 *     - lastMessage?: { content, userId, userName, createdAt }
 *     - readAt?: Record<uid, Timestamp> (per-member read receipt)
 *     - name?: string (group only)
 *
 *   conversations/{conversationId}/messages/{messageId}
 *     - userId, userName, userAvatar
 *     - content
 *     - attachments?: GifAttachment[]
 *     - reactions?: Record<emoji, uid[]>
 *     - createdAt
 *
 * DM ids are deterministic (`dm_{uidA}_{uidB}` with the lower uid first)
 * so opening a DM with the same person from any device always lands on
 * the same conversation. Group ids are random Firestore-generated.
 *
 * Production note: the current Firestore rules are open until 2026-05-28.
 * Before public launch, harden the conversations rules with:
 *   match /conversations/{convId} {
 *     allow read, write: if request.auth.uid in resource.data.participantIds;
 *   }
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useAuth } from "./store";
import { useDMPrefs, type DMNotifyLevel } from "./use-dm-prefs";
import type { GifAttachment } from "./use-firebase-chat";

/** Convenience subscription used by the top-nav unread badge. */
function useDMPrefsForBadge(): Record<string, DMNotifyLevel> {
  return useDMPrefs((s) => s.prefs);
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ConversationType = "dm" | "group";

export interface ConversationLastMessage {
  content: string;
  userId: string;
  userName: string;
  createdAt: string; // ISO
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participantIds: string[];
  createdBy: string;
  name?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  lastMessage?: ConversationLastMessage;
  /** Per-user "last read" timestamp - ISO string. */
  readAt?: Record<string, string>;
  /** Per-user "still typing as of" timestamp - ISO string. Entries
   *  older than ~6s are treated as stale and not shown. */
  typing?: Record<string, string>;
}

export interface DMMessage {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  attachments?: GifAttachment[];
  reactions?: Record<string, string[]>;
  timestamp: string; // ISO
  editedAt?: string | null;
  threadParentId?: string | null;
  threadCount?: number;
}

interface FirestoreConversationDoc {
  type: ConversationType;
  participantIds: string[];
  createdBy: string;
  name?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastMessage?: {
    content: string;
    userId: string;
    userName: string;
    createdAt: Timestamp;
  };
  readAt?: Record<string, Timestamp>;
  typing?: Record<string, Timestamp>;
}

interface FirestoreDMMessageDoc {
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  attachments?: GifAttachment[];
  reactions?: Record<string, string[]>;
  createdAt?: Timestamp;
  editedAt?: Timestamp | null;
  threadParentId?: string | null;
  threadCount?: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Deterministic 1:1 DM id so the same pair of users always lands on
 * the same conversation regardless of who opened it first. */
export function dmConversationId(uidA: string, uidB: string): string {
  const [low, high] = [uidA, uidB].sort();
  return `dm_${low}_${high}`;
}

/**
 * Convert a Firestore Timestamp to an ISO string. Returns an empty
 * string when the timestamp isn't available yet (e.g. an in-flight
 * write whose serverTimestamp() hasn't been confirmed by the server
 * yet).
 *
 * This used to fall back to `new Date().toISOString()` which created
 * a NEW "now" value on every render - producing notifications that
 * said "1 second ago" forever because their createdAt drifted with
 * the wall clock. An empty string is stable and lets consumers
 * detect "no real timestamp yet" and skip rendering relative time.
 */
function tsToIso(t: Timestamp | undefined | null): string {
  if (!t) return "";
  try {
    return t.toDate().toISOString();
  } catch {
    return "";
  }
}

function readAtToIso(
  r: Record<string, Timestamp> | undefined,
): Record<string, string> | undefined {
  if (!r) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) {
    out[k] = tsToIso(v);
  }
  return out;
}

function docToConversation(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): Conversation {
  const data = d.data() as FirestoreConversationDoc;
  return {
    id: d.id,
    type: data.type,
    participantIds: data.participantIds ?? [],
    createdBy: data.createdBy,
    name: data.name,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
    lastMessage: data.lastMessage
      ? {
          content: data.lastMessage.content,
          userId: data.lastMessage.userId,
          userName: data.lastMessage.userName,
          createdAt: tsToIso(data.lastMessage.createdAt),
        }
      : undefined,
    readAt: readAtToIso(data.readAt),
    typing: readAtToIso(data.typing),
  };
}

function docToDMMessage(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
  conversationId: string,
): DMMessage {
  const data = d.data() as FirestoreDMMessageDoc;
  return {
    id: d.id,
    conversationId,
    userId: data.userId,
    userName: data.userName,
    userAvatar: data.userAvatar ?? "",
    content: data.content ?? "",
    attachments: data.attachments,
    reactions: data.reactions ?? {},
    timestamp: tsToIso(data.createdAt),
    editedAt: data.editedAt ? tsToIso(data.editedAt) : null,
    threadParentId: data.threadParentId ?? null,
    threadCount: data.threadCount ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Conversation list (sidebar)                                         */
/* ------------------------------------------------------------------ */

export interface UseConversationsResult {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  isFirebase: boolean;
}

/**
 * Realtime list of conversations the current user participates in.
 * Sorted by `updatedAt` descending so the most active chats float to
 * the top of the sidebar.
 */
export function useConversations(): UseConversationsResult {
  const userId = useAuth((s) => s.user?.id);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(
    Boolean(userId) && isFirebaseConfigured,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !isFirebaseConfigured) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) return;
    setLoading(true);
    setError(null);
    // Sort client-side by updatedAt rather than asking Firestore to.
    // The composite index `(participantIds CONTAINS, updatedAt DESC)`
    // has to be deployed for Firestore to accept that combination -
    // if it's missing, onSnapshot fires once with a permissions/index
    // error and then never fires again, leaving the recipient's
    // sidebar permanently empty even though their conversations
    // exist in Firestore. Single-field array-contains is auto-
    // indexed so this query just works without any deploy step.
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", userId),
      limit(100),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToConversation)
          .sort((a, b) => {
            // Newest activity first; conversations without an
            // updatedAt yet (in-flight optimistic creates) sink to
            // the bottom rather than throwing the comparator.
            const av = a.updatedAt || "";
            const bv = b.updatedAt || "";
            return bv.localeCompare(av);
          });
        setConversations(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error("[conversations]", err);
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [userId]);

  return {
    conversations,
    loading,
    error,
    isFirebase: isFirebaseConfigured,
  };
}

/**
 * Returns the total count of conversations with at least one message
 * the current user hasn't read. Muted conversations don't count -
 * the navigation badge should reflect things you'd actually want to
 * be pinged about.
 */
export function useUnreadConversations(): number {
  const userId = useAuth((s) => s.user?.id);
  const { conversations } = useConversations();
  // Lazy import to avoid a circular dep (use-dm-prefs has no other deps,
  // but keeping the boundary explicit here makes the badge usable from
  // anywhere without dragging the whole chat tree along).
  const mutedMap = useDMPrefsForBadge();
  return useMemo(() => {
    if (!userId) return 0;
    let n = 0;
    for (const c of conversations) {
      if (!c.lastMessage) continue;
      // Skip in-flight writes whose serverTimestamp hasn't resolved
      // yet - we can't make a meaningful read/unread decision until
      // the server confirms the message's actual time.
      if (!c.lastMessage.createdAt) continue;
      if (c.lastMessage.userId === userId) continue;
      if (mutedMap[c.id] === "none") continue;
      const lastRead = c.readAt?.[userId];
      // lastRead === "" is an optimistic read receipt mid-flight;
      // treat it as already-read so the badge doesn't blip back on.
      if (lastRead === "") continue;
      if (!lastRead || lastRead < c.lastMessage.createdAt) {
        n += 1;
      }
    }
    return n;
  }, [conversations, userId, mutedMap]);
}

/* ------------------------------------------------------------------ */
/* Single conversation messages                                        */
/* ------------------------------------------------------------------ */

export interface DMSendOptions {
  attachments?: GifAttachment[];
  threadParentId?: string;
}

export interface UseConversationMessagesResult {
  messages: DMMessage[];
  conversation: Conversation | null;
  sendMessage: (
    content: string,
    opts?: DMSendOptions,
  ) => Promise<string | null>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  markAsRead: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Realtime messages for a single conversation, plus its metadata, plus
 * a `sendMessage` helper that bumps `updatedAt` + `lastMessage` so the
 * sidebar reorders correctly.
 */
export function useConversationMessages(
  conversationId: string | null,
): UseConversationMessagesResult {
  const user = useAuth((s) => s.user);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(conversationId));
  const [error, setError] = useState<string | null>(null);

  /* Subscribe to the conversation document itself. */
  useEffect(() => {
    if (!conversationId || !isFirebaseConfigured) {
      setConversation(null);
      return;
    }
    const db = getDb();
    if (!db) return;
    const ref = doc(db, "conversations", conversationId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setConversation(null);
          return;
        }
        setConversation(
          docToConversation(snap as QueryDocumentSnapshot<DocumentData, DocumentData>),
        );
      },
      (err: FirestoreError) => {
        console.error("[conversation doc]", err);
      },
    );
    return () => unsub();
  }, [conversationId]);

  /* Subscribe to its messages subcollection. Sort client-side to
   * avoid a composite-index requirement that silently breaks the
   * listener when not deployed. Only show top-level messages here;
   * thread replies are loaded separately by useConversationThreadReplies. */
  useEffect(() => {
    if (!conversationId || !isFirebaseConfigured) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) return;
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      limit(200),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs
          .map((d) => docToDMMessage(d, conversationId))
          .filter((m) => !m.threadParentId)
          .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
        setMessages(all);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error("[conversation messages]", err);
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [conversationId]);

  const sendMessage = useCallback(
    async (
      content: string,
      opts: DMSendOptions = {},
    ): Promise<string | null> => {
      const text = content.trim();
      const hasAttachments = !!opts.attachments && opts.attachments.length > 0;
      if (!text && !hasAttachments) return null;
      if (!user || !conversationId || !isFirebaseConfigured) return null;
      const db = getDb();
      if (!db) return null;
      try {
        const msgRef = await addDoc(
          collection(db, "conversations", conversationId, "messages"),
          {
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar ?? "",
            content: text,
            attachments: opts.attachments ?? [],
            reactions: {},
            threadParentId: opts.threadParentId ?? null,
            threadCount: 0,
            createdAt: serverTimestamp(),
          },
        );
        // If this is a thread reply, bump the parent's threadCount so
        // the main message list can show "N replies" without a join.
        if (opts.threadParentId) {
          try {
            const parentRef = doc(
              db,
              "conversations",
              conversationId,
              "messages",
              opts.threadParentId,
            );
            const parentSnap = messages.find(
              (m) => m.id === opts.threadParentId,
            );
            const nextCount = (parentSnap?.threadCount ?? 0) + 1;
            await updateDoc(parentRef, { threadCount: nextCount });
          } catch (innerErr) {
            console.warn("[conversation] thread count bump failed", innerErr);
          }
        }
        // Bump the conversation's updatedAt + lastMessage so it floats
        // to the top of the sidebar and shows a preview.
        await updateDoc(doc(db, "conversations", conversationId), {
          updatedAt: serverTimestamp(),
          lastMessage: {
            content: text || "(attachment)",
            userId: user.id,
            userName: user.name,
            createdAt: serverTimestamp(),
          },
          [`readAt.${user.id}`]: serverTimestamp(),
        });
        return msgRef.id;
      } catch (err) {
        console.error("[conversation send]", err);
        const m = err instanceof Error ? err.message : "Send failed";
        setError(m);
        return null;
      }
    },
    [conversationId, user, messages],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user || !conversationId || !isFirebaseConfigured) return;
      const db = getDb();
      if (!db) return;
      const msg = messages.find((m) => m.id === messageId);
      const has = (msg?.reactions?.[emoji] ?? []).includes(user.id);
      try {
        await updateDoc(
          doc(db, "conversations", conversationId, "messages", messageId),
          {
            [`reactions.${emoji}`]: has
              ? arrayRemove(user.id)
              : arrayUnion(user.id),
          },
        );
      } catch (err) {
        console.error("[conversation reaction]", err);
      }
    },
    [conversationId, user, messages],
  );

  /**
   * Edit a DM/group message you authored. Also rewrites the parent
   * conversation's `lastMessage.content` if the message being edited
   * is the most recent one, so the sidebar preview stays accurate.
   */
  const editMessage = useCallback(
    async (messageId: string, newContent: string): Promise<boolean> => {
      if (!user || !conversationId || !isFirebaseConfigured) return false;
      const trimmed = newContent.trim();
      if (!trimmed) return false;
      const db = getDb();
      if (!db) return false;
      try {
        await updateDoc(
          doc(db, "conversations", conversationId, "messages", messageId),
          {
            content: trimmed,
            editedAt: serverTimestamp(),
          },
        );
        // Keep the sidebar preview in sync if this was the last
        // message. We compare by id against the last message in the
        // current snapshot (not server-side) since lastMessage in
        // Firestore is denormalized.
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.id === messageId) {
          await updateDoc(doc(db, "conversations", conversationId), {
            "lastMessage.content": trimmed,
          });
        }
        return true;
      } catch (err) {
        console.error("[conversation edit]", err);
        const m = err instanceof Error ? err.message : "Edit failed";
        setError(m);
        return false;
      }
    },
    [conversationId, user, messages],
  );

  /**
   * Delete a DM/group message you authored. If the deleted message
   * happens to be the conversation's `lastMessage`, repoint the
   * preview to the previous message (or clear it). The room itself
   * stays around so the other participant doesn't lose context.
   */
  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!user || !conversationId || !isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        await deleteDoc(
          doc(db, "conversations", conversationId, "messages", messageId),
        );
        const idx = messages.findIndex((m) => m.id === messageId);
        const wasLast = idx === messages.length - 1;
        if (wasLast) {
          const prev = messages[idx - 1];
          if (prev) {
            await updateDoc(doc(db, "conversations", conversationId), {
              lastMessage: {
                content: prev.content || "(attachment)",
                userId: prev.userId,
                userName: prev.userName,
                createdAt: serverTimestamp(),
              },
            });
          } else {
            await updateDoc(doc(db, "conversations", conversationId), {
              lastMessage: deleteField(),
            });
          }
        }
        return true;
      } catch (err) {
        console.error("[conversation delete]", err);
        const m = err instanceof Error ? err.message : "Delete failed";
        setError(m);
        return false;
      }
    },
    [conversationId, user, messages],
  );

  const markAsRead = useCallback(async () => {
    if (!user || !conversationId || !isFirebaseConfigured) return;
    if (!conversation?.lastMessage) return;
    if (conversation.lastMessage.userId === user.id) return;
    const lastRead = conversation.readAt?.[user.id];
    if (lastRead && lastRead >= conversation.lastMessage.createdAt) return;
    const db = getDb();
    if (!db) return;
    try {
      await updateDoc(doc(db, "conversations", conversationId), {
        [`readAt.${user.id}`]: serverTimestamp(),
      });
    } catch (err) {
      console.error("[conversation markAsRead]", err);
    }
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

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

/**
 * Result of a DM-permission check. The UI uses `reason` to show a
 * friendly toast / banner when the recipient has restricted who can
 * message them.
 */
export interface DMCheckResult {
  ok: boolean;
  /** Stable code so callers can branch without parsing strings. */
  code?: "self" | "blocked" | "friends-only";
  /** Human-readable explanation shown to the sender. */
  reason?: string;
}

/**
 * Pure check of "can <currentUserId> DM <otherUserId>?".
 *
 * - "self": you can't DM yourself
 * - "blocked": recipient turned DMs off entirely
 * - "friends-only": recipient only accepts DMs from friends and the
 *   current user isn't on that list
 *
 * Friendship is checked synchronously - the caller passes in the set
 * of accepted-friend uids since we can't subscribe to Firestore
 * synchronously here. Pass an empty set if friendship state isn't
 * known yet (the call will be denied for friends-only profiles,
 * which is the safe default).
 */
export function canSendDM(args: {
  currentUserId: string;
  otherUserId: string;
  recipientPrivacy: "anyone" | "friends" | "none" | undefined;
  friendIds: Set<string>;
}): DMCheckResult {
  const { currentUserId, otherUserId, recipientPrivacy, friendIds } = args;
  if (currentUserId === otherUserId) {
    return {
      ok: false,
      code: "self",
      reason: "You can't message yourself.",
    };
  }
  const privacy = recipientPrivacy ?? "anyone";
  if (privacy === "none") {
    return {
      ok: false,
      code: "blocked",
      reason: "This member has turned off direct messages.",
    };
  }
  if (privacy === "friends" && !friendIds.has(otherUserId)) {
    return {
      ok: false,
      code: "friends-only",
      reason: "This member only accepts messages from friends. Send a friend request first.",
    };
  }
  return { ok: true };
}

/**
 * Try to translate a "best guess" recipient id (which can be a
 * mock-seed id like "u-mock-maria", a legacy registry id like
 * "u-1730...", or even literal "admin") into the recipient's actual
 * Firebase Auth UID. Falls back to whatever was passed in when no
 * resolution is possible.
 *
 * Why we need this: getOrCreateDM stamps `participantIds` with
 * whatever id the caller had locally. If that id doesn't match the
 * recipient's real Firebase UID, the recipient's own
 * `where("participantIds", "array-contains", uid)` snapshot will
 * never see the conversation, and DMs silently disappear from
 * their side. Looking the user up by email here ensures we always
 * write the canonical uid.
 */
export async function resolveToFirebaseUid(
  candidateId: string,
  candidateEmail?: string,
): Promise<string> {
  if (!isFirebaseConfigured) return candidateId;
  const db = getDb();
  if (!db) return candidateId;
  // First: trust the id if there's already a /users doc under it.
  // Most Firebase users land here - this is fast and free.
  try {
    const snap = await getDoc(doc(db, "users", candidateId));
    if (snap.exists()) return candidateId;
  } catch {
    // ignore - fall through to the email fallback
  }
  // No doc -> probably a mock/registry id. Try resolving by email.
  if (!candidateEmail) return candidateId;
  try {
    const q = query(
      collection(db, "users"),
      where("email", "==", candidateEmail.toLowerCase().trim()),
      limit(1),
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
  } catch (err) {
    console.warn("[resolveToFirebaseUid] email lookup failed", err);
  }
  return candidateId;
}

/**
 * Read-only fetch of the recipient's privacy setting from their
 * Firestore profile. Falls back to "anyone" when the doc doesn't
 * exist or Firestore is unreachable so we don't block messages on
 * an offline check.
 */
export async function fetchDMPrivacy(
  otherUserId: string,
): Promise<"anyone" | "friends" | "none"> {
  if (!isFirebaseConfigured) return "anyone";
  const db = getDb();
  if (!db) return "anyone";
  try {
    const snap = await getDoc(doc(db, "users", otherUserId));
    if (!snap.exists()) return "anyone";
    const data = snap.data() as { dmPrivacy?: "anyone" | "friends" | "none" };
    return data.dmPrivacy ?? "anyone";
  } catch (err) {
    console.warn("[fetchDMPrivacy] failed - defaulting to open", err);
    return "anyone";
  }
}

/**
 * Get-or-create a 1:1 DM between the current user and `otherUserId`.
 * Returns the conversation id (deterministic via dmConversationId)
 * or a structured error object if the recipient's privacy settings
 * block the conversation.
 *
 * Idempotent: calling it twice from either side never creates a
 * duplicate conversation.
 */
/**
 * Wrap any Firestore op with a hard timeout so a hung connection
 * (offline, slow rules eval, dropped websocket) can't lock callers
 * waiting forever. Surfaces a clear error message instead of the
 * UI staying stuck on its "Opening..." state.
 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

export async function getOrCreateDM(
  currentUserId: string,
  otherUserId: string,
  options: {
    friendIds?: Set<string>;
    /** Recipient email - used to translate a stale local id into
     *  the recipient's real Firebase UID before we stamp it on
     *  participantIds. Strongly recommended. */
    otherEmail?: string;
  } = {},
): Promise<{ id: string | null; error?: DMCheckResult }> {
  if (!isFirebaseConfigured) {
    return {
      id: null,
      error: {
        ok: false,
        reason: "Direct messages need Firebase to be configured.",
      },
    };
  }
  console.debug("[getOrCreateDM] start", {
    currentUserId,
    otherUserId,
    otherEmail: options.otherEmail,
  });
  let resolvedOtherId = otherUserId;
  try {
    // Resolve to the recipient's real Firebase UID up front so the
    // conversation we create is actually visible from their side.
    resolvedOtherId = await withTimeout(
      resolveToFirebaseUid(otherUserId, options.otherEmail),
      8_000,
      "resolveToFirebaseUid",
    );
  } catch (err) {
    console.warn("[getOrCreateDM] uid resolution skipped", err);
  }
  console.debug("[getOrCreateDM] resolved id", resolvedOtherId);

  if (currentUserId === resolvedOtherId) {
    return { id: null, error: canSendDM({
      currentUserId,
      otherUserId: resolvedOtherId,
      recipientPrivacy: "anyone",
      friendIds: options.friendIds ?? new Set(),
    }) };
  }
  let recipientPrivacy: "anyone" | "friends" | "none" = "anyone";
  try {
    recipientPrivacy = await withTimeout(
      fetchDMPrivacy(resolvedOtherId),
      8_000,
      "fetchDMPrivacy",
    );
  } catch (err) {
    console.warn("[getOrCreateDM] privacy lookup skipped, defaulting open", err);
  }
  const check = canSendDM({
    currentUserId,
    otherUserId: resolvedOtherId,
    recipientPrivacy,
    friendIds: options.friendIds ?? new Set(),
  });
  if (!check.ok) {
    return { id: null, error: check };
  }

  const db = getDb();
  if (!db) return { id: null, error: { ok: false, reason: "Firestore unavailable." } };
  const id = dmConversationId(currentUserId, resolvedOtherId);
  const ref = doc(db, "conversations", id);
  try {
    const snap = await withTimeout(getDoc(ref), 8_000, "getDoc(conversation)");
    if (snap.exists()) {
      console.debug("[getOrCreateDM] existing conversation", id);
      return { id };
    }
    const participantIds = [currentUserId, resolvedOtherId].sort();
    await withTimeout(
      setDoc(ref, {
        type: "dm" as ConversationType,
        participantIds,
        createdBy: currentUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        readAt: {},
      }),
      8_000,
      "setDoc(conversation)",
    );
    console.debug("[getOrCreateDM] created conversation", id);
    return { id };
  } catch (err) {
    console.error("[getOrCreateDM]", err);
    return {
      id: null,
      error: {
        ok: false,
        reason: err instanceof Error ? err.message : "Couldn't open the conversation.",
      },
    };
  }
}

/**
 * Create a brand-new group conversation. Auto-includes the creator,
 * defaults the name to "<a>, <b>, <c>..." if not provided.
 *
 * Returns the new conversation id, or null on failure.
 */
export async function createGroupConversation(
  currentUserId: string,
  participantIds: string[],
  options: { name?: string } = {},
): Promise<string | null> {
  if (!isFirebaseConfigured) return null;
  const db = getDb();
  if (!db) return null;
  const all = Array.from(new Set([currentUserId, ...participantIds])).sort();
  if (all.length < 2) return null;
  console.debug("[createGroupConversation]", { all, name: options.name });
  try {
    const ref = await withTimeout(
      addDoc(collection(db, "conversations"), {
        type: "group" as ConversationType,
        participantIds: all,
        createdBy: currentUserId,
        name: options.name?.trim() || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        readAt: {},
      }),
      10_000,
      "createGroupConversation",
    );
    console.debug("[createGroupConversation] created", ref.id);
    return ref.id;
  } catch (err) {
    console.error("[createGroupConversation]", err);
    return null;
  }
}

/**
 * Add new participants to an existing conversation. If the conversation
 * is a 1:1 DM this implicitly converts it to a group (3+ people).
 */
export async function addParticipants(
  conversationId: string,
  newUserIds: string[],
): Promise<boolean> {
  if (!isFirebaseConfigured || newUserIds.length === 0) return false;
  const db = getDb();
  if (!db) return false;
  try {
    const ref = doc(db, "conversations", conversationId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data() as FirestoreConversationDoc;
    const existing = new Set(data.participantIds ?? []);
    const filtered = newUserIds.filter((id) => !existing.has(id));
    if (filtered.length === 0) return true;
    const merged = Array.from(new Set([...(data.participantIds ?? []), ...filtered])).sort();
    await updateDoc(ref, {
      participantIds: merged,
      // Promote a 1:1 DM to a group when a 3rd member arrives - DMs
      // can't have more than 2 participants by definition.
      type: merged.length > 2 ? "group" : data.type,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("[addParticipants]", err);
    return false;
  }
}

/**
 * Remove yourself from a group conversation. For DMs we just delete
 * the entire conversation (there's no "leave a DM" semantic).
 */
export async function leaveConversation(
  conversationId: string,
  currentUserId: string,
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  const db = getDb();
  if (!db) return false;
  try {
    const ref = doc(db, "conversations", conversationId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data() as FirestoreConversationDoc;
    if (data.type === "dm") {
      // For DMs, leaving = removing the conversation entirely. The
      // peer would otherwise see a one-sided room.
      await deleteDoc(ref);
      return true;
    }
    const next = (data.participantIds ?? []).filter((id) => id !== currentUserId);
    if (next.length === 0) {
      await deleteDoc(ref);
      return true;
    }
    await updateDoc(ref, {
      participantIds: next,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("[leaveConversation]", err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Typing indicators                                                   */
/* ------------------------------------------------------------------ */

/** Entries older than this are treated as stale "stopped typing". */
export const TYPING_FRESH_MS = 6_000;
/** Don't write more often than this while the user keeps typing. */
const TYPING_THROTTLE_MS = 2_500;

/**
 * Mark the current user as typing in a conversation. Throttled so a
 * fast typist doesn't hammer Firestore - at most one write per
 * TYPING_THROTTLE_MS while still typing.
 */
async function writeTyping(
  conversationId: string,
  userId: string,
  isTyping: boolean,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      [`typing.${userId}`]: isTyping ? serverTimestamp() : deleteField(),
    });
  } catch (err) {
    // Permissions / offline - silently drop, this is best-effort.
    console.warn("[typing] write failed", err);
  }
}

/**
 * React-side helper: returns a `notifyTyping(stillTyping: boolean)`
 * callback that throttles "still typing" writes and immediately
 * clears the flag when called with `false`. Cleans up the typing
 * entry on unmount and on conversation switch.
 */
export function useTypingPublisher(conversationId: string | null): {
  notifyTyping: (stillTyping: boolean) => void;
} {
  const userId = useAuth((s) => s.user?.id);
  const lastWriteRef = useRef<number>(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef<boolean>(false);

  // Clear typing on conversation change / unmount.
  useEffect(() => {
    return () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      if (isTypingRef.current && conversationId && userId) {
        void writeTyping(conversationId, userId, false);
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
          void writeTyping(conversationId, userId, false);
        }
        return;
      }

      const now = Date.now();
      if (now - lastWriteRef.current >= TYPING_THROTTLE_MS) {
        lastWriteRef.current = now;
        isTypingRef.current = true;
        void writeTyping(conversationId, userId, true);
      }
      // Auto-clear after a short idle - if the user keeps typing,
      // the next call will reset this timer.
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(() => {
        if (isTypingRef.current && conversationId && userId) {
          isTypingRef.current = false;
          void writeTyping(conversationId, userId, false);
        }
      }, TYPING_FRESH_MS);
    },
    [conversationId, userId],
  );

  return { notifyTyping };
}

/**
 * Read-side helper: returns the user IDs currently typing in the
 * conversation (excluding the current user, excluding stale entries).
 * Recomputes every second so stale entries fall off automatically.
 */
export function useTypingUsers(conversation: Conversation | null): string[] {
  const currentUserId = useAuth((s) => s.user?.id);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!conversation?.typing) return;
    const iv = setInterval(() => setNow(Date.now()), 1_500);
    return () => clearInterval(iv);
  }, [conversation?.typing]);

  return useMemo(() => {
    if (!conversation?.typing) return [];
    const out: string[] = [];
    for (const [uid, iso] of Object.entries(conversation.typing)) {
      if (uid === currentUserId) continue;
      const t = new Date(iso).getTime();
      if (Number.isFinite(t) && now - t <= TYPING_FRESH_MS) {
        out.push(uid);
      }
    }
    return out;
  }, [conversation?.typing, currentUserId, now]);
}

/** Rename a group conversation. No-op for DMs. */
export async function renameConversation(
  conversationId: string,
  newName: string,
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  const db = getDb();
  if (!db) return false;
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      name: newName.trim() || undefined,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("[renameConversation]", err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Thread replies for DMs                                              */
/* ------------------------------------------------------------------ */

/**
 * Realtime subscription to thread replies inside a DM/group
 * conversation. Works the same as useThreadMessages for channels
 * but queries the subcollection instead of the top-level /messages.
 *
 * Only subscribes when `parentId` is non-null (the thread is
 * expanded), so collapsed messages don't pay the listener cost.
 */
export function useConversationThreadReplies(
  conversationId: string | null,
  parentId: string | null,
): {
  replies: DMMessage[];
  loading: boolean;
} {
  const [replies, setReplies] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId || !parentId || !isFirebaseConfigured) {
      setReplies([]);
      return;
    }
    const db = getDb();
    if (!db) return;
    setLoading(true);
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      where("threadParentId", "==", parentId),
      limit(100),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => docToDMMessage(d, conversationId))
          .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
        setReplies(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error("[conversation thread replies]", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [conversationId, parentId]);

  return { replies, loading };
}
