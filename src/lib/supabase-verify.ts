/**
 * Server-side Supabase access-token verification. Mirrors
 * firebase-verify.ts: a network check against GoTrue validates the
 * token's signature/expiry and returns the auth user.
 *
 * IDENTITY NOTE: the verified auth uid is NOT the app's canonical
 * users.id for migrated members (their ids are original Firebase UIDs).
 * The canonical id must be resolved BY EMAIL via the service-role
 * client — never mint downstream identities from the Supabase uuid.
 *
 * Intended for Route Handlers only.
 */

import { getServiceClient, getAnonServerClient } from "./supabase-server";

/** True when Supabase auth tokens can be verified server-side. */
export const SUPABASE_AUTH_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY),
);

/** Verify an access token; returns auth uid + email, or null when invalid. */
export async function verifySupabaseToken(
  token: string,
): Promise<{ authUid: string; email: string | null } | null> {
  const client = getServiceClient() ?? getAnonServerClient();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return { authUid: data.user.id, email: data.user.email ?? null };
  } catch (err) {
    console.error("[supabase-verify] token verification failed", err);
    return null;
  }
}

/**
 * Look up the canonical app user row by verified email. Prefers the
 * service-role client, but falls back to the anon server client when the
 * service key is unset: the `users` SELECT policy is public (the member
 * directory), so the role is anon-readable. This keeps server-side admin
 * checks (e.g. sync-now) working even if SUPABASE_SERVICE_ROLE_KEY is
 * missing — the downstream operation surfaces the real missing-key error
 * instead of a misleading 403 here. Case-insensitive; prefers the oldest
 * row when historic duplicates exist, matching client-side resolution.
 */
export async function resolveAppUserByEmail(
  email: string,
): Promise<{ id: string; role: string } | null> {
  const svc = getServiceClient() ?? getAnonServerClient();
  if (!svc || !email.trim()) return null;
  try {
    // Escape ilike metacharacters so this is a literal (case-insensitive)
    // match — underscores are common in real addresses.
    const pattern = email.trim().replace(/([\\%_])/g, "\\$1");
    const { data, error } = await svc
      .from("users")
      .select("id, role")
      .ilike("email", pattern)
      .order("created_at", { ascending: true })
      .limit(1);
    if (error || !data?.[0]) return null;
    return {
      id: data[0].id as string,
      role: (data[0].role as string) || "amiga",
    };
  } catch (err) {
    console.error("[supabase-verify] user lookup failed", err);
    return null;
  }
}

/** Canonical users.id for a verified email, or null when unresolvable. */
export async function resolveCanonicalUserIdByEmail(
  email: string,
): Promise<string | null> {
  const row = await resolveAppUserByEmail(email);
  return row?.id ?? null;
}

/**
 * Server-side fine-grained permission check: does the user behind this
 * verified email hold `permission` via any of their assigned roles?
 *
 * Resolves users → user_roles → roles.permissions (the same model the
 * client uses). Used to gate privileged endpoints (e.g. calendar
 * sync-now) on a role permission rather than only the coarse
 * `users.role === 'admin'`. The legacy admin account always passes via
 * its role; this widens access only to roles explicitly granted the
 * permission.
 */
export async function emailHasPermission(
  email: string,
  permission: string,
): Promise<boolean> {
  const svc = getServiceClient() ?? getAnonServerClient();
  if (!svc || !email.trim()) return false;
  try {
    const appUser = await resolveAppUserByEmail(email);
    if (!appUser) return false;
    const { data: ur, error: urErr } = await svc
      .from("user_roles")
      .select("role_id")
      .eq("user_id", appUser.id);
    if (urErr || !ur || ur.length === 0) return false;
    const roleIds = ur.map((r) => r.role_id as string);
    const { data: roles, error: rolesErr } = await svc
      .from("roles")
      .select("permissions")
      .in("id", roleIds);
    if (rolesErr || !roles) return false;
    return roles.some((r) => {
      const perms = (r.permissions ?? []) as unknown;
      return Array.isArray(perms) && perms.includes(permission);
    });
  } catch (err) {
    console.error("[supabase-verify] permission check failed", err);
    return false;
  }
}
