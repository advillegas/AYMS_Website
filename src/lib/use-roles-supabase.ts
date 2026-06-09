"use client";

/**
 * Supabase persistence for the roles store. The Zustand store in
 * use-roles-store.ts stays the in-memory cache; these functions replace
 * the Firestore read-sync + writes when useSupabaseBackend is on.
 *
 * roles      -> public.roles      (one row per role)
 * userRoles  -> public.user_roles (user_id, role_id) junction rows
 *
 * Writes mirror the Firestore "replace the whole document" semantics by
 * diffing against the table (upsert present + delete missing) so the two
 * backends behave identically from the store's point of view.
 */

import { useEffect } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";
import { DEFAULT_ROLES, DEFAULT_USER_ROLES, type Role } from "./roles";

interface RoleRow {
  id: string;
  name: string;
  color: string;
  priority: number;
  permissions: string[];
  system: boolean;
}
interface UserRoleRow {
  user_id: string;
  role_id: string;
}

function rowToRole(r: RoleRow): Role {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    priority: r.priority,
    permissions: (r.permissions ?? []) as Role["permissions"],
    system: r.system,
  };
}

export async function writeRolesToSupabase(roles: Role[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("roles").upsert(
      roles.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        priority: r.priority,
        permissions: r.permissions ?? [],
        system: r.system ?? false,
      })),
    );
    // Delete roles no longer present.
    const keep = roles.map((r) => r.id);
    if (keep.length > 0) {
      await sb
        .from("roles")
        .delete()
        .not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`);
    }
  } catch (err) {
    console.warn("[roles:sb] write failed", err);
  }
}

export async function writeUserRolesToSupabase(
  map: Record<string, string[]>,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const rows: UserRoleRow[] = [];
    for (const uid of Object.keys(map)) {
      for (const rid of map[uid] ?? []) rows.push({ user_id: uid, role_id: rid });
    }
    // Replace the whole junction: clear then insert. The table is tiny
    // (one row per user-role) so a full rewrite is simplest + correct.
    await sb.from("user_roles").delete().neq("user_id", "\u0000");
    if (rows.length > 0) await sb.from("user_roles").insert(rows);
  } catch (err) {
    console.warn("[userRoles:sb] write failed", err);
  }
}

export async function seedSupabaseRolesIfEmpty(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { count } = await sb
      .from("roles")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return;
    await writeRolesToSupabase(DEFAULT_ROLES);
    await writeUserRolesToSupabase(DEFAULT_USER_ROLES);
  } catch (err) {
    console.warn("[roles:sb] seed failed", err);
  }
}

/**
 * Realtime sync: subscribe to both tables, rebuild the store's roles
 * array + userRoles map on any change. setStore is the Zustand setState.
 */
export function useRolesSyncSupabase(
  setStore: (partial: {
    roles?: Role[];
    userRoles?: Record<string, string[]>;
    _synced?: boolean;
  }) => void,
): void {
  useEffect(() => {
    void seedSupabaseRolesIfEmpty();

    const unsubRoles = subscribeQuery<RoleRow>(
      "roles",
      (sb) => sb.from("roles").select("*").order("priority", { ascending: false }),
      (rows) => {
        if (rows.length > 0) {
          setStore({ roles: rows.map(rowToRole), _synced: true });
        }
      },
      (msg) => console.warn("[roles:sb] sync failed", msg),
    );

    const unsubUserRoles = subscribeQuery<UserRoleRow>(
      "user_roles",
      (sb) => sb.from("user_roles").select("*"),
      (rows) => {
        const map: Record<string, string[]> = {};
        for (const r of rows) {
          (map[r.user_id] ??= []).push(r.role_id);
        }
        setStore({ userRoles: map });
      },
      (msg) => console.warn("[userRoles:sb] sync failed", msg),
    );

    return () => {
      unsubRoles();
      unsubUserRoles();
    };
  }, [setStore]);
}
