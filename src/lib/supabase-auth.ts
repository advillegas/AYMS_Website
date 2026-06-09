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
  if (sb) {
    try {
      const { data } = await sb
        .from("users")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .limit(1)
        .maybeSingle();
      if (data) {
        const existing = mapUserRowToUser(data as SupabaseUserRow);
        // Touch last_active_at so they show online immediately.
        await sb
          .from("users")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", existing.id);
        return existing;
      }
    } catch (e) {
      console.warn("[supabase-auth] canonical lookup failed", e);
    }
  }
  // New member — seed a row keyed by the auth uid.
  const user: User = {
    id: fallbackId,
    name: seed.name || email.split("@")[0] || "Amiga",
    email: email.toLowerCase().trim(),
    avatar: seed.avatar ?? "",
    bio: "New amiga!",
    location: "",
    joinedDate: today,
    role: ROLE_DEFAULT,
  };
  if (sb) {
    try {
      await sb.from("users").upsert(userToRow(user), { onConflict: "id" });
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
): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name } },
  });
  if (error) throw error;
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
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : undefined;
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw error;
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
