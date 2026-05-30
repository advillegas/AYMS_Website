"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useRef } from "react";
import type { RichMessage } from "./use-firebase-chat";
import { useAuth } from "./store";

/**
 * Per-channel notification preferences for the AYMS community chat.
 *
 * Three states per channel:
 *   - "all": every new message triggers a browser notification
 *   - "mentions": only messages that @-mention the user fire
 *   - "none": muted (default for high-volume channels)
 *
 * Default is "mentions" so users get a useful baseline without being
 * spammed - they can crank a channel up to "all" or mute it entirely.
 */

export type NotifyLevel = "all" | "mentions" | "none";

interface NotificationPrefsState {
  prefs: Record<string, NotifyLevel>;
  defaultLevel: NotifyLevel;
  setLevel: (channelId: string, level: NotifyLevel) => void;
  getLevel: (channelId: string) => NotifyLevel;
  setDefaultLevel: (level: NotifyLevel) => void;
}

export const useNotificationPrefs = create<NotificationPrefsState>()(
  persist(
    (set, get) => ({
      prefs: {},
      defaultLevel: "mentions",
      setLevel: (channelId, level) =>
        set((s) => ({ prefs: { ...s.prefs, [channelId]: level } })),
      getLevel: (channelId) => get().prefs[channelId] ?? get().defaultLevel,
      setDefaultLevel: (level) => set({ defaultLevel: level }),
    }),
    {
      name: "ayms-notify-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Detect whether `userName` (or any of these mention forms) appears in
 * the message content: @everyone, @channel, @<name>. Names are matched
 * loosely (case-insensitive, first-name ok).
 */
function isMentioned(content: string, userName: string): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();
  if (lower.includes("@everyone") || lower.includes("@channel")) return true;
  const first = userName.split(" ")[0]?.toLowerCase();
  if (first && lower.includes(`@${first}`)) return true;
  // Whole-name (joined with hyphen or no space) form, e.g. @maria-garcia
  const slug = userName.toLowerCase().replace(/\s+/g, "-");
  if (lower.includes(`@${slug}`)) return true;
  return false;
}

/**
 * Request browser notification permission on first interaction (auto
 * called when the chat mounts). Idempotent.
 */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

/**
 * Side-effect hook: watch a message stream and surface a browser
 * notification for any new message that matches the channel's notify
 * level. Skips messages authored by the current user, and messages
 * that arrived in the initial snapshot (we only fire for net-new ones).
 */
export function useChannelNotifications(
  channelId: string,
  messages: RichMessage[],
  channelName: string,
) {
  const currentUser = useAuth((s) => s.user);
  const level = useNotificationPrefs((s) => s.getLevel(channelId));
  const lastSeenIdRef = useRef<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  useEffect(() => {
    // Reset on channel change.
    lastSeenIdRef.current = null;
    seededRef.current = false;
  }, [channelId]);

  useEffect(() => {
    if (messages.length === 0) return;

    if (!seededRef.current) {
      // First load: don't fire for backlog. Just record the high-water
      // mark and wait for fresh messages.
      lastSeenIdRef.current = messages[messages.length - 1].id;
      seededRef.current = true;
      return;
    }

    if (level === "none") {
      lastSeenIdRef.current = messages[messages.length - 1].id;
      return;
    }
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      lastSeenIdRef.current = messages[messages.length - 1].id;
      return;
    }
    if (document.visibilityState === "visible") {
      // Tab is focused - don't double-notify; the chat is already
      // updating in front of the user.
      lastSeenIdRef.current = messages[messages.length - 1].id;
      return;
    }

    const lastId = lastSeenIdRef.current;
    const lastIdx = lastId ? messages.findIndex((m) => m.id === lastId) : -1;
    const fresh = messages.slice(lastIdx + 1);

    for (const m of fresh) {
      if (currentUser && m.userId === currentUser.id) continue;
      if (
        level === "mentions" &&
        currentUser &&
        !isMentioned(m.content, currentUser.name)
      ) {
        continue;
      }
      try {
        new Notification(`#${channelName} - ${m.userName}`, {
          body: m.content || "(attachment)",
          tag: `ayms-${channelId}-${m.id}`,
          icon: "/ayms-logo.svg",
        });
      } catch {
        // ignore - some browsers throw if the tab is in some background states
      }
    }
    lastSeenIdRef.current = messages[messages.length - 1].id;
  }, [messages, level, channelId, channelName, currentUser]);
}
