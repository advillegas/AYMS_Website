"use client";

/**
 * Supabase persistence for the moderation store. The Zustand store in
 * use-moderation-store.ts stays the in-memory cache; these functions
 * replace the Firestore writes + realtime sync when useSupabaseBackend
 * is on (mirroring how use-roles-supabase.ts backs use-roles-store.ts).
 *
 * config/moderation -> public.moderation_config (singleton row
 *                      id='moderation'; bans/mutes jsonb keep the exact
 *                      Record<uid, entry> shape of the Firestore doc)
 * reports           -> public.reports
 * modActions        -> public.mod_actions
 *
 * All ids written here are canonical app user ids (users.id), never
 * Supabase auth uids — RLS maps the session to the canonical id.
 */

import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery, tsToIso } from "./supabase-helpers";
import type {
  BanEntry,
  ModAction,
  ModActionKind,
  ModReport,
  MuteEntry,
  ReportStatus,
  ReportTargetType,
} from "./use-moderation-store";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/* Config (bans/mutes) writes + seed                                   */
/* ------------------------------------------------------------------ */

export async function writeModerationConfigToSupabase(cfg: {
  bans: Record<string, BanEntry>;
  mutes: Record<string, MuteEntry>;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("moderation_config").upsert({
    id: "moderation",
    bans: cfg.bans,
    mutes: cfg.mutes,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.warn("[moderation:sb] config write failed", error.message);
  }
}

export async function seedSupabaseModerationIfEmpty(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { count } = await sb
      .from("moderation_config")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return;
    // Best-effort: RLS limits config writes to admins, so a regular
    // member's seed attempt fails quietly (same as Firestore rules).
    await sb
      .from("moderation_config")
      .insert({ id: "moderation", bans: {}, mutes: {} });
  } catch (err) {
    console.warn("[moderation:sb] seed check failed", err);
  }
}

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

export async function logModActionToSupabase(
  action: Omit<ModAction, "id" | "createdAt">,
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  // Client-generated id so the insert needs no SELECT-back (RLS keeps
  // the audit log admin-read-only).
  const id = generateId();
  const { error } = await sb.from("mod_actions").insert({
    id,
    action: action.action,
    actor_id: action.actorId,
    actor_name: action.actorName,
    target_id: action.targetId,
    target_name: action.targetName ?? null,
    reason: action.reason ?? null,
    meta: action.meta ?? null,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.warn("[moderation:sb] logModAction failed", error.message);
    return null;
  }
  return id;
}

/* ------------------------------------------------------------------ */
/* Kick — drop the member's profile row (soft action, no ban)          */
/* ------------------------------------------------------------------ */

export async function deleteUserProfileSupabase(uid: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("users").delete().eq("id", uid);
  if (error) {
    console.warn("[moderation:sb] kick profile delete failed", error.message);
  }
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export async function submitReportToSupabase(
  input: Omit<ModReport, "id" | "status" | "createdAt">,
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const id = generateId();
  const { error } = await sb.from("reports").insert({
    id,
    target_type: input.targetType,
    target_id: input.targetId,
    channel_id: input.channelId ?? null,
    reported_user_id: input.reportedUserId,
    reporter_id: input.reporterId,
    reporter_name: input.reporterName ?? null,
    reason: input.reason,
    snapshot: {
      content: input.snapshot.content ?? null,
      userName: input.snapshot.userName ?? null,
    },
    status: "open",
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.warn("[moderation:sb] submitReport failed", error.message);
    return null;
  }
  return id;
}

export async function resolveReportInSupabase(
  reportId: string,
  status: "resolved" | "dismissed",
  actor: { id: string; name: string },
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("reports")
    .update({
      status,
      resolved_by: actor.id,
      resolved_by_name: actor.name,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) {
    console.warn("[moderation:sb] resolveReport failed", error.message);
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Realtime sync (moderation_config singleton row)                     */
/* ------------------------------------------------------------------ */

interface ModerationConfigRow {
  id: string;
  bans: Record<string, BanEntry> | null;
  mutes: Record<string, MuteEntry> | null;
}

let listenerStarted = false;

/**
 * Supabase counterpart of useModerationSyncFirebase — same module-level
 * guard so the duplicate mounts (community shell + every chat surface)
 * collapse into a single realtime subscription.
 */
export function useModerationSyncSupabase(
  setStore: (partial: {
    bans?: Record<string, BanEntry>;
    mutes?: Record<string, MuteEntry>;
    _synced?: boolean;
  }) => void,
): void {
  useEffect(() => {
    if (listenerStarted) return;
    listenerStarted = true;

    void seedSupabaseModerationIfEmpty();

    const unsub = subscribeQuery<ModerationConfigRow>(
      "moderation_config",
      (sb) => sb.from("moderation_config").select("*").eq("id", "moderation"),
      (rows) => {
        const row = rows[0];
        if (!row) return;
        setStore({
          bans: row.bans ?? {},
          mutes: row.mutes ?? {},
          _synced: true,
        });
      },
      (msg) => console.warn("[moderation:sb] sync failed", msg),
      { column: "id", value: "moderation" },
    );

    return () => {
      unsub();
      listenerStarted = false;
    };
  }, [setStore]);
}

/* ------------------------------------------------------------------ */
/* Reports + audit-log subscriptions                                   */
/* ------------------------------------------------------------------ */

interface ReportRow {
  id: string;
  target_type: string;
  target_id: string;
  channel_id: string | null;
  reported_user_id: string;
  reporter_id: string;
  reporter_name: string | null;
  reason: string;
  snapshot: { content?: string | null; userName?: string | null } | null;
  status: string;
  created_at: string | null;
}

function rowToReport(r: ReportRow): ModReport {
  return {
    id: r.id,
    targetType: (r.target_type as ReportTargetType) ?? "message",
    targetId: r.target_id ?? "",
    channelId: r.channel_id ?? null,
    reportedUserId: r.reported_user_id ?? "",
    reporterId: r.reporter_id ?? "",
    reporterName: r.reporter_name ?? null,
    reason: r.reason ?? "",
    snapshot: {
      content: r.snapshot?.content ?? null,
      userName: r.snapshot?.userName ?? null,
    },
    status: (r.status as ReportStatus) ?? "open",
    createdAt: tsToIso(r.created_at) || new Date().toISOString(),
  };
}

interface ModActionRow {
  id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  target_id: string;
  target_name: string | null;
  reason: string | null;
  meta: Record<string, unknown> | null;
  created_at: string | null;
}

function rowToModAction(r: ModActionRow): ModAction {
  return {
    id: r.id,
    action: (r.action as ModActionKind) ?? "delete-message",
    actorId: r.actor_id ?? "",
    actorName: r.actor_name ?? "",
    targetId: r.target_id ?? "",
    targetName: r.target_name ?? null,
    reason: r.reason ?? null,
    meta: r.meta ?? null,
    createdAt: tsToIso(r.created_at) || new Date().toISOString(),
  };
}

export function useReportsSupabase(): {
  reports: ModReport[];
  loading: boolean;
} {
  const [reports, setReports] = useState<ModReport[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = subscribeQuery<ReportRow>(
      "reports",
      (sb) =>
        sb
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300),
      (rows) => {
        setReports(rows.map(rowToReport));
        setLoading(false);
      },
      (msg) => {
        console.warn("[moderation:sb] reports query failed", msg);
        setLoading(false);
      },
    );
    return unsub;
  }, []);
  return { reports, loading };
}

export function useModActionsSupabase(): {
  actions: ModAction[];
  loading: boolean;
} {
  const [actions, setActions] = useState<ModAction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = subscribeQuery<ModActionRow>(
      "mod_actions",
      (sb) =>
        sb
          .from("mod_actions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300),
      (rows) => {
        setActions(rows.map(rowToModAction));
        setLoading(false);
      },
      (msg) => {
        console.warn("[moderation:sb] modActions query failed", msg);
        setLoading(false);
      },
    );
    return unsub;
  }, []);
  return { actions, loading };
}
