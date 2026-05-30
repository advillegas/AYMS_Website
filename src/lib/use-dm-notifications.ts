"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./store";
import { useConversations, type Conversation } from "./use-conversations";
import { useDMPrefs } from "./use-dm-prefs";
import { ensureNotificationPermission } from "./use-channel-notifications";

/**
 * Watches the current user's conversation list for new last-message
 * timestamps and surfaces a browser notification for each net-new
 * one that:
 *   - wasn't authored by the current user
 *   - belongs to a conversation that isn't muted
 *   - isn't the conversation the user is *currently looking at*
 *     (passed in as `activeConversationId` so the active chat doesn't
 *     double-notify on top of the live message append)
 *
 * Mounted once at /community/messages so it survives navigation
 * between conversations within that page.
 */
export function useDMNotifications(
  activeConversationId: string | null,
): void {
  const currentUser = useAuth((s) => s.user);
  const { conversations } = useConversations();
  const isMuted = useDMPrefs((s) => s.isMuted);

  // Per-conversation high-water mark of the last message we've already
  // surfaced (or skipped). Keyed by conversationId.
  const seenAtRef = useRef<Record<string, string>>({});
  const seededRef = useRef<boolean>(false);

  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (conversations.length === 0) return;

    if (!seededRef.current) {
      // First load: don't fire for backlog. Record current state.
      const initial: Record<string, string> = {};
      for (const c of conversations) {
        if (c.lastMessage) initial[c.id] = c.lastMessage.createdAt;
      }
      seenAtRef.current = initial;
      seededRef.current = true;
      return;
    }

    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      // Still update high-water marks so we don't fire a backlog later.
      for (const c of conversations) {
        if (c.lastMessage) seenAtRef.current[c.id] = c.lastMessage.createdAt;
      }
      return;
    }

    for (const c of conversations) {
      if (!c.lastMessage) continue;
      if (c.lastMessage.userId === currentUser.id) {
        seenAtRef.current[c.id] = c.lastMessage.createdAt;
        continue;
      }
      const lastSeen = seenAtRef.current[c.id];
      if (lastSeen && lastSeen >= c.lastMessage.createdAt) continue;

      // Always advance the high-water mark even if we end up skipping
      // (e.g. muted) so the next message doesn't re-trigger.
      seenAtRef.current[c.id] = c.lastMessage.createdAt;

      if (isMuted(c.id)) continue;
      if (c.id === activeConversationId && document.visibilityState === "visible") {
        continue;
      }

      try {
        const title =
          c.type === "dm"
            ? c.lastMessage.userName
            : `${c.name?.trim() || "Group"} - ${c.lastMessage.userName}`;
        new Notification(title, {
          body: c.lastMessage.content || "(attachment)",
          tag: `ayms-dm-${c.id}`,
          icon: "/ayms-logo.svg",
        });
      } catch {
        // Some browsers throw in background tabs - ignore.
      }
    }
  }, [conversations, currentUser, activeConversationId, isMuted]);
}

/** Convenience predicate used by the conversation list to render a
 *  bell-off badge without forcing each row to subscribe. */
export function useIsConversationMuted(conversationId: string): boolean {
  return useDMPrefs((s) => s.isMuted(conversationId));
}

// Re-export so consumers don't need a second import.
export type { Conversation };
