"use client";

/**
 * Moderation core — bans, mutes, reports, and the audit log.
 *
 * Mirrors the realtime pattern of `use-roles-store.ts`:
 *   - A single Firestore config doc holds the live ban/mute state:
 *       config/moderation → { bans: Record<uid, BanEntry>,
 *                             mutes: Record<uid, MuteEntry> }
 *   - The Zustand store is the local cache; `useModerationSync()`
 *     mounts the onSnapshot listener that keeps it in sync across
 *     every browser/device. Mutations write to Firestore first and
 *     the snapshot listener propagates the change back into the store.
 *
 * Reports and the audit log are append-only top-level collections:
 *       reports/{id}     — flagged messages / members awaiting triage
 *       modActions/{id}  — immutable record of every moderation action
 *
 * Falls back to localStorage-only (and graceful no-ops for the
 * collections) when Firestore isn't configured so the site still
 * works in local development, matching the rest of the data layer.
 *
 * IMPORTANT — enforcement is defense-in-depth, not a fortress. The
 * client filters muted/banned authors and disables their composer,
 * but the REAL backstop is Firestore security rules: a banned member
 * who hand-crafts a write must be rejected server-side. Mirror these
 * checks in `firestore.rules` before launch (deny create on
 * `messages` when the author's uid is a key of `config/moderation`'s
 * `bans`/active `mutes`).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { pushNotification } from "./notify";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface BanEntry {
  /** uid of the moderator who issued the ban. */
  by: string;
  byName: string;
  reason: string;
  /** ISO timestamp the ban was issued. */
  at: string;
}

export interface MuteEntry {
  by: string;
  byName: string;
  reason: string;
  /**
   * ISO timestamp the mute expires, or null for an indefinite mute.
   * A mute is "active" while now < until (or always, when null).
   */
  until: string | null;
  at: string;
}

export type ReportTargetType = "message" | "member";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface ModReport {
  id: string;
  targetType: ReportTargetType;
  /** message id or member uid depending on targetType. */
  targetId: string;
  /** channel the reported message lives in (message reports only). */
  channelId?: string | null;
  /** uid of the member being reported (author of the message). */
  reportedUserId: string;
  reporterId: string;
  reporterName?: string | null;
  reason: string;
  /** Frozen copy so the queue still has context after a delete. */
  snapshot: { content?: string | null; userName?: string | null };
  status: ReportStatus;
  createdAt: string;
}

export type ModActionKind =
  | "ban"
  | "unban"
  | "mute"
  | "unmute"
  | "kick"
  | "delete-message"
  | "resolve-report"
  | "dismiss-report";

export interface ModAction {
  id: string;
  action: ModActionKind;
  actorId: string;
  actorName: string;
  targetId: string;
  targetName?: string | null;
  reason?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** A mute is active while it has no expiry or the expiry is in the future. */
export function isMuteActive(mute: MuteEntry | undefined | null): boolean {
  if (!mute) return false;
  if (!mute.until) return true;
  return new Date(mute.until).getTime() > Date.now();
}

function tsToIso(t: Timestamp | undefined | null): string {
  if (!t) return new Date().toISOString();
  try {
    return t.toDate().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/* ------------------------------------------------------------------ */
/* Store shape                                                         */
/* ------------------------------------------------------------------ */

interface ModerationConfig {
  bans: Record<string, BanEntry>;
  mutes: Record<string, MuteEntry>;
}

interface Actor {
  id: string;
  name: string;
}

interface ModerationState {
  bans: Record<string, BanEntry>;
  mutes: Record<string, MuteEntry>;
  /** True once the Firestore listener has delivered its first snapshot. */
  _synced: boolean;

  ban: (uid: string, actor: Actor, reason: string, targetName?: string) => void;
  unban: (uid: string, actor: Actor, targetName?: string) => void;
  mute: (
    uid: string,
    actor: Actor,
    reason: string,
    durationMs: number | null,
    targetName?: string,
  ) => void;
  unmute: (uid: string, actor: Actor, targetName?: string) => void;
  /**
   * Kick is a soft action: it deletes the member's Firestore profile
   * (so they drop out of the live directory) but does NOT add a ban,
   * so they can re-join. Returns a promise so callers can await the
   * profile removal before refreshing UI.
   */
  kick: (uid: string, actor: Actor, reason: string, targetName?: string) => Promise<void>;

  submitReport: (
    input: Omit<ModReport, "id" | "status" | "createdAt">,
  ) => Promise<string | null>;
  resolveReport: (
    report: ModReport,
    actor: Actor,
    status: "resolved" | "dismissed",
  ) => Promise<void>;

  logModAction: (
    action: Omit<ModAction, "id" | "createdAt">,
  ) => Promise<string | null>;
}

/* ------------------------------------------------------------------ */
/* Firestore persistence helpers                                       */
/* ------------------------------------------------------------------ */

async function writeModerationConfig(cfg: ModerationConfig): Promise<void> {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(doc(db, "config", "moderation"), cfg, { merge: false });
  } catch (err) {
    console.warn("[moderation] config write failed", err);
  }
}

async function seedFirestoreIfEmpty(): Promise<void> {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  try {
    const snap = await getDoc(doc(db, "config", "moderation"));
    if (!snap.exists()) {
      await setDoc(doc(db, "config", "moderation"), { bans: {}, mutes: {} });
      console.debug("[moderation] seeded Firestore with empty config");
    }
  } catch (err) {
    console.warn("[moderation] seed check failed", err);
  }
}

/* ------------------------------------------------------------------ */
/* Zustand store                                                       */
/* ------------------------------------------------------------------ */

export const useModeration = create<ModerationState>()(
  persist(
    (set, get) => ({
      bans: {},
      mutes: {},
      _synced: false,

      logModAction: async (action) => {
        if (!isFirebaseConfigured) return null;
        const db = getDb();
        if (!db) return null;
        try {
          const ref = await addDoc(collection(db, "modActions"), {
            action: action.action,
            actorId: action.actorId,
            actorName: action.actorName,
            targetId: action.targetId,
            targetName: action.targetName ?? null,
            reason: action.reason ?? null,
            meta: action.meta ?? null,
            createdAt: serverTimestamp(),
          });
          return ref.id;
        } catch (err) {
          console.warn("[moderation] logModAction failed", err);
          return null;
        }
      },

      ban: (uid, actor, reason, targetName) => {
        const entry: BanEntry = {
          by: actor.id,
          byName: actor.name,
          reason: reason.trim(),
          at: new Date().toISOString(),
        };
        set((s) => {
          const bans = { ...s.bans, [uid]: entry };
          void writeModerationConfig({ bans, mutes: s.mutes });
          return { bans };
        });
        void get().logModAction({
          action: "ban",
          actorId: actor.id,
          actorName: actor.name,
          targetId: uid,
          targetName: targetName ?? null,
          reason: reason.trim() || null,
        });
        void pushNotification(uid, {
          kind: "mod",
          title: "You've been banned from the community",
          body: reason.trim()
            ? `Reason: ${reason.trim()}`
            : "Contact a leader if you think this was a mistake.",
          actorId: actor.id,
          actorName: actor.name,
        });
      },

      unban: (uid, actor, targetName) => {
        set((s) => {
          if (!s.bans[uid]) return s;
          const bans = { ...s.bans };
          delete bans[uid];
          void writeModerationConfig({ bans, mutes: s.mutes });
          return { bans };
        });
        void get().logModAction({
          action: "unban",
          actorId: actor.id,
          actorName: actor.name,
          targetId: uid,
          targetName: targetName ?? null,
        });
        void pushNotification(uid, {
          kind: "mod",
          title: "Your ban has been lifted",
          body: "Welcome back — you can post in the community again.",
          actorId: actor.id,
          actorName: actor.name,
        });
      },

      mute: (uid, actor, reason, durationMs, targetName) => {
        const until =
          durationMs && durationMs > 0
            ? new Date(Date.now() + durationMs).toISOString()
            : null;
        const entry: MuteEntry = {
          by: actor.id,
          byName: actor.name,
          reason: reason.trim(),
          until,
          at: new Date().toISOString(),
        };
        set((s) => {
          const mutes = { ...s.mutes, [uid]: entry };
          void writeModerationConfig({ bans: s.bans, mutes });
          return { mutes };
        });
        void get().logModAction({
          action: "mute",
          actorId: actor.id,
          actorName: actor.name,
          targetId: uid,
          targetName: targetName ?? null,
          reason: reason.trim() || null,
          meta: { until },
        });
        void pushNotification(uid, {
          kind: "mod",
          title: until
            ? "You've been temporarily muted"
            : "You've been muted",
          body: until
            ? `You can't post until ${new Date(until).toLocaleString()}.${
                reason.trim() ? ` Reason: ${reason.trim()}` : ""
              }`
            : reason.trim()
              ? `Reason: ${reason.trim()}`
              : "You can't post in the community right now.",
          actorId: actor.id,
          actorName: actor.name,
        });
      },

      unmute: (uid, actor, targetName) => {
        set((s) => {
          if (!s.mutes[uid]) return s;
          const mutes = { ...s.mutes };
          delete mutes[uid];
          void writeModerationConfig({ bans: s.bans, mutes });
          return { mutes };
        });
        void get().logModAction({
          action: "unmute",
          actorId: actor.id,
          actorName: actor.name,
          targetId: uid,
          targetName: targetName ?? null,
        });
        void pushNotification(uid, {
          kind: "mod",
          title: "You can post again",
          body: "Your mute has been lifted.",
          actorId: actor.id,
          actorName: actor.name,
        });
      },

      kick: async (uid, actor, reason, targetName) => {
        // Log + notify regardless; the profile delete is best-effort.
        void get().logModAction({
          action: "kick",
          actorId: actor.id,
          actorName: actor.name,
          targetId: uid,
          targetName: targetName ?? null,
          reason: reason.trim() || null,
        });
        void pushNotification(uid, {
          kind: "mod",
          title: "You've been removed from the community",
          body: reason.trim()
            ? `Reason: ${reason.trim()} You're welcome to re-join.`
            : "You're welcome to re-join.",
          actorId: actor.id,
          actorName: actor.name,
        });
        if (!isFirebaseConfigured) return;
        const db = getDb();
        if (!db) return;
        try {
          // Match the members admin "remove from Firestore" behavior:
          // drop the profile doc so they leave the directory. Their
          // auth account is unaffected, so a re-join recreates it.
          await deleteDoc(doc(db, "users", uid));
        } catch (err) {
          console.warn("[moderation] kick profile delete failed", err);
        }
      },

      submitReport: async (input) => {
        if (!isFirebaseConfigured) return null;
        const db = getDb();
        if (!db) return null;
        try {
          const ref = await addDoc(collection(db, "reports"), {
            targetType: input.targetType,
            targetId: input.targetId,
            channelId: input.channelId ?? null,
            reportedUserId: input.reportedUserId,
            reporterId: input.reporterId,
            reporterName: input.reporterName ?? null,
            reason: input.reason,
            snapshot: {
              content: input.snapshot.content ?? null,
              userName: input.snapshot.userName ?? null,
            },
            status: "open",
            createdAt: serverTimestamp(),
          });
          return ref.id;
        } catch (err) {
          console.warn("[moderation] submitReport failed", err);
          return null;
        }
      },

      resolveReport: async (report, actor, status) => {
        if (!isFirebaseConfigured) return;
        const db = getDb();
        if (!db) return;
        try {
          await updateDoc(doc(db, "reports", report.id), {
            status,
            resolvedBy: actor.id,
            resolvedByName: actor.name,
            resolvedAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn("[moderation] resolveReport failed", err);
          return;
        }
        void get().logModAction({
          action: status === "resolved" ? "resolve-report" : "dismiss-report",
          actorId: actor.id,
          actorName: actor.name,
          targetId: report.targetId,
          targetName: report.snapshot.userName ?? null,
          meta: { reportId: report.id, targetType: report.targetType },
        });
        // Tell the reporter their flag was actioned.
        if (report.reporterId) {
          void pushNotification(report.reporterId, {
            kind: "report",
            title:
              status === "resolved"
                ? "Your report was actioned"
                : "Your report was reviewed",
            body:
              status === "resolved"
                ? "Thanks for flagging it — a moderator took action."
                : "A moderator reviewed it and took no further action.",
            actorId: actor.id,
            actorName: actor.name,
            href: "/community/admin/moderation",
          });
        }
      },
    }),
    {
      name: "ayms-moderation",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // localStorage stays as a fallback cache for offline / non-Firebase.
      partialize: (s) => ({ bans: s.bans, mutes: s.mutes }),
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Firestore realtime listener (mounted once via useModerationSync)    */
/* ------------------------------------------------------------------ */

let listenerStarted = false;

/**
 * Mounts the `config/moderation` onSnapshot listener exactly once.
 *
 * House note: roles/channels are synced from `community-shell.tsx`
 * (useRolesSync / useChannelsSync). This slice doesn't own that file,
 * so the same hook is also invoked from `useChannelChat` in
 * `use-firebase-chat.ts` (the chat is mounted everywhere moderation
 * needs to be enforced). The module-level guard makes the duplicate
 * mount a no-op, so it's safe for the lead to ALSO add this to the
 * shell — recommended for parity with the other config syncs.
 */
export function useModerationSync(): void {
  useEffect(() => {
    if (!isFirebaseConfigured || listenerStarted) return;
    listenerStarted = true;
    const db = getDb();
    if (!db) {
      listenerStarted = false;
      return;
    }

    void seedFirestoreIfEmpty();

    const unsub = onSnapshot(
      doc(db, "config", "moderation"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Partial<ModerationConfig>;
        useModeration.setState({
          bans: data.bans ?? {},
          mutes: data.mutes ?? {},
          _synced: true,
        });
      },
      (err) => console.warn("[moderation] snapshot failed", err),
    );

    return () => {
      unsub();
      listenerStarted = false;
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/* Derived hooks                                                       */
/* ------------------------------------------------------------------ */

/** Is this user currently banned? */
export function useIsBanned(uid: string | null | undefined): boolean {
  return useModeration((s) => (uid ? Boolean(s.bans[uid]) : false));
}

/** Is this user currently muted (active, non-expired)? */
export function useIsMuted(uid: string | null | undefined): boolean {
  return useModeration((s) => (uid ? isMuteActive(s.mutes[uid]) : false));
}

/** The active mute entry for a user, or null. */
export function useMuteEntry(
  uid: string | null | undefined,
): MuteEntry | null {
  return useModeration((s) => {
    if (!uid) return null;
    const m = s.mutes[uid];
    return isMuteActive(m) ? m : null;
  });
}

/* ------------------------------------------------------------------ */
/* Reports + audit-log subscriptions (page-level, not in the store)    */
/* ------------------------------------------------------------------ */

function docToReport(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): ModReport {
  const data = d.data();
  return {
    id: d.id,
    targetType: (data.targetType as ReportTargetType) ?? "message",
    targetId: data.targetId ?? "",
    channelId: data.channelId ?? null,
    reportedUserId: data.reportedUserId ?? "",
    reporterId: data.reporterId ?? "",
    reporterName: data.reporterName ?? null,
    reason: data.reason ?? "",
    snapshot: {
      content: data.snapshot?.content ?? null,
      userName: data.snapshot?.userName ?? null,
    },
    status: (data.status as ReportStatus) ?? "open",
    createdAt: tsToIso(data.createdAt as Timestamp | undefined),
  };
}

function docToModAction(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): ModAction {
  const data = d.data();
  return {
    id: d.id,
    action: (data.action as ModActionKind) ?? "delete-message",
    actorId: data.actorId ?? "",
    actorName: data.actorName ?? "",
    targetId: data.targetId ?? "",
    targetName: data.targetName ?? null,
    reason: data.reason ?? null,
    meta: (data.meta as Record<string, unknown> | null) ?? null,
    createdAt: tsToIso(data.createdAt as Timestamp | undefined),
  };
}

/**
 * Live subscription to moderation reports. Sorted newest-first
 * client-side (no orderBy → no composite index, matching the house
 * pattern). Returns [] gracefully when Firebase isn't configured.
 */
export function useReports(): { reports: ModReport[]; loading: boolean } {
  const [reports, setReports] = useState<ModReport[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setReports([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "reports"), limit(300));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToReport)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setReports(list);
        setLoading(false);
      },
      (err) => {
        console.warn("[moderation] reports snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);
  return { reports, loading };
}

/**
 * Live subscription to the append-only audit log. Newest-first.
 */
export function useModActions(): { actions: ModAction[]; loading: boolean } {
  const [actions, setActions] = useState<ModAction[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setActions([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "modActions"), limit(300));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToModAction)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setActions(list);
        setLoading(false);
      },
      (err) => {
        console.warn("[moderation] modActions snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);
  return { actions, loading };
}
