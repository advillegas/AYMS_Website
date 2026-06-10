"use client";

/**
 * Supabase Auth wrapper mirroring firebase-auth.ts. Delegated to when
 * useSupabaseBackend is on.
 *
 * Identity & content linkage
 * --------------------------
 * The migrated data is keyed by the users' original Firebase UIDs. To
 * keep a returning member linked to all their existing messages / DMs /
 * roles after they reset their password on Supabase, we treat the app's
 * `User.id` as the canonical id resolved BY EMAIL from the `users`
 * table — not the new Supabase auth UUID. New members (no existing row)
 * get a fresh row keyed by their Supabase auth id. RLS is permissive
 * during dual-run so this decoupling is safe; it matches how the
 * Firebase setup already treated `User.id` as an opaque string.
 */

import { getSupabase } from "./supabase";
import {
  mapUserRowToUser,
  userToRow,
  type SupabaseUserRow,
} from "./supabase-user-map";
import type { User } from "./store";

const ROLE_DEFAULT: User["role"] = "amiga";

/**
 * Canonical admin email. MUST stay in sync with firebase-auth.ts
 * ADMIN_EMAIL and the server-side bridge in /api/auth/login (defined
 * locally to avoid a runtime import cycle with firebase-auth.ts).
 */
const ADMIN_EMAIL = "admin@ayms.com";

/** Supabase auth uids are UUIDs; migrated Firebase UIDs are not. */
const UUID_RE =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/**
 * Sentinel returned by supabaseSignUp when the project requires email
 * confirmation: signUp succeeded but returned no session, so the
 * caller must NOT mark the user authenticated. The users row is seeded
 * on the first real sign-in after confirmation instead.
 */
export const CONFIRM_EMAIL = "confirm-email" as const;
export type ConfirmEmailSentinel = typeof CONFIRM_EMAIL;

/**
 * Find the canonical app user for an email. Returns the migrated row's
 * User (preserving the original id + profile) when one exists, else a
 * freshly-seeded User keyed by `fallbackId` (the Supabase auth uid).
 */
async function resolveCanonicalUser(
  email: string,
  fallbackId: string,
  seed: { name?: string; avatar?: string },
): Promise<User> {
  const sb = getSupabase();
  const today = new Date().toISOString().split("T")[0];
  const lowerEmail = email.toLowerCase().trim();
  if (sb) {
    try {
      const { data } = await sb
        .from("users")
        .select("*")
        .eq("email", lowerEmail)
        .limit(1)
        .maybeSingle();
      if (data) {
        const existing = mapUserRowToUser(data as SupabaseUserRow);
        // Backfill users.auth_id for this JWT (security-definer RPC)
        // so RLS can match by auth uid instead of the email fallback.
        // Best-effort: tolerate the function not existing yet.
        const { error: linkErr } = await sb.rpc("link_auth_identity");
        if (linkErr) {
          console.warn("[supabase-auth] link_auth_identity failed", linkErr);
        }
        // Touch last_active_at so they show online immediately.
        await sb
          .from("users")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", existing.id);
        return existing;
      }
      // No row at this email. Before seeding a fresh row (= identity
      // fork), check whether this auth uid is already linked to a
      // canonical row — happens when the user changed their auth email
      // or OAuthed with a different Google address. If so, follow the
      // linkage and update the row's email instead of forking.
      if (UUID_RE.test(fallbackId)) {
        const { data: linked } = await sb
          .from("users")
          .select("*")
          .eq("auth_id", fallbackId)
          .limit(1)
          .maybeSingle();
        if (linked) {
          const existing = mapUserRowToUser(linked as SupabaseUserRow);
          await sb
            .from("users")
            .update({
              email: lowerEmail,
              last_active_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          return { ...existing, email: lowerEmail };
        }
      }
    } catch (e) {
      console.warn("[supabase-auth] canonical lookup failed", e);
    }
  }
  // New member — seed a row keyed by the auth uid.
  const user: User = {
    id: fallbackId,
    name: seed.name || email.split("@")[0] || "Amiga",
    email: lowerEmail,
    avatar: seed.avatar ?? "",
    bio: "New amiga!",
    location: "",
    joinedDate: today,
    role: ROLE_DEFAULT,
  };
  if (sb) {
    try {
      const row = userToRow(user);
      // Record the auth linkage up front so an email change later
      // resolves back to this row instead of forking again.
      if (UUID_RE.test(fallbackId)) row.auth_id = fallbackId;
      await sb.from("users").upsert(row, { onConflict: "id" });
    } catch (e) {
      console.warn("[supabase-auth] seed row failed", e);
    }
  }
  return user;
}

export async function supabaseSignUp(
  name: string,
  email: string,
  password: string,
): Promise<User | ConfirmEmailSentinel | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  // Confirm-email projects return a user but NO session from signUp.
  // Authenticating (or seeding a users row with no JWT behind it)
  // would fake a logged-in state — surface the sentinel instead and
  // let the store show a "check your inbox" message.
  if (!data.session) return CONFIRM_EMAIL;
  const authId = data.user?.id ?? `sb-${Date.now().toString(36)}`;
  // For a brand-new signup there won't be a migrated row, so this
  // seeds one keyed by the auth id.
  return resolveCanonicalUser(email, authId, { name });
}

export async function supabaseSignIn(
  email: string,
  password: string,
): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  const authId = data.user?.id ?? email;
  return resolveCanonicalUser(email, authId, {
    name: (data.user?.user_metadata?.name as string) ?? undefined,
  });
}

export async function supabaseSignInWithGoogle(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  // OAuth is a full redirect. The session is picked up on return by
  // useSupabaseAuthSync (detectSessionInUrl). Returning null here is
  // expected — the browser navigates away before this resolves.
  const redirectTo =
    typeof window !== "undefined" ? window.location.href : undefined;
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { prompt: "select_account" } },
  });
  if (error) throw error;
  return null;
}

export async function supabaseSignOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.auth.signOut();
  } catch (e) {
    console.warn("[supabase-auth] signOut failed", e);
  }
}

export async function supabaseSendPasswordReset(email: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase isn't configured on this site.");
  // /reset-password consumes the recovery session (detectSessionInUrl)
  // and calls auth.updateUser. The URL must be in the Supabase
  // dashboard's auth redirect allow-list.
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : undefined;
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw error;
}

/**
 * Establish a real Supabase Auth session for the password-only admin so
 * client-side admin writes carry a JWT that RLS (is_app_admin()) can
 * see — the Supabase mirror of ensureFirebaseAdminSession.
 *
 * /api/auth/login provisions the admin@ayms.com auth user (password
 * tracking ADMIN_PASSWORD) and seeds the role='admin' users row via the
 * service role BEFORE this runs; here we only sign in. Best-effort:
 * failures are logged loudly and swallowed — the UI keeps working with
 * the legacy "admin" store identity (use-auth-hydrated guards it from
 * being clobbered by this bridge session).
 */
export async function ensureSupabaseAdminSession(
  password: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data } = await sb.auth.getSession();
    if (data.session?.user?.email?.toLowerCase() === ADMIN_EMAIL) return;
    const { error } = await sb.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password,
    });
    if (error) {
      // Loud on purpose: the UI admin login SUCCEEDED but Supabase
      // writes guarded by RLS will fail without this session.
      console.error(
        "[admin-bridge] ADMIN MUTATIONS MAY FAIL: couldn't establish the " +
          "Supabase admin session. If SUPABASE_SERVICE_ROLE_KEY isn't " +
          "configured the server can't provision admin@ayms.com.",
        error,
      );
    }
  } catch (e) {
    console.warn("[admin-bridge] Supabase admin sign-in failed", e);
  }
}

/**
 * Mirror Supabase Auth session changes into the Zustand store. Returns
 * an unsubscribe function. Used by useFirebaseAuthSync's Supabase
 * branch.
 */
export function onSupabaseAuthChange(
  apply: (user: User | null) => void,
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  // Resolve the initial session on mount (covers OAuth redirect return
  // and persisted sessions across reloads).
  void sb.auth.getSession().then(async ({ data }) => {
    const session = data.session;
    if (!session?.user?.email) return;
    const user = await resolveCanonicalUser(
      session.user.email,
      session.user.id,
      { name: (session.user.user_metadata?.name as string) ?? undefined },
    );
    apply(user);
  });

  const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT" || !session?.user) {
      apply(null);
      return;
    }
    if (!session.user.email) return;
    const user = await resolveCanonicalUser(
      session.user.email,
      session.user.id,
      { name: (session.user.user_metadata?.name as string) ?? undefined },
    );
    apply(user);
  });

  return () => sub.subscription.unsubscribe();
}
