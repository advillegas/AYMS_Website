"use client";

import { useEffect, useSyncExternalStore } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth, type User } from "./store";
import {
  getAuthInstance,
  isFirebaseConfigured,
} from "./firebase";
import { useSupabaseBackend, getSupabase } from "./supabase";
import { onSupabaseAuthChange } from "./supabase-auth";
import { readUserProfile, upsertUserProfile } from "./firebase-auth";

/**
 * Whether the persisted Zustand auth state has finished hydrating
 * from localStorage. Necessary because:
 *
 *   useAuth() always returns the *initial* state (user: null,
 *   isAuthenticated: false) on the first render, even if there's a
 *   valid session in localStorage. The persist middleware swaps in
 *   the real values asynchronously after mount.
 *
 * Any code that gates on `isAuthenticated` for a redirect MUST wait
 * for hydration first, otherwise it'll bounce signed-in users to the
 * login page on every cold load.
 */
export function useAuthHydrated(): boolean {
  // useSyncExternalStore with a `false` server snapshot: the server and
  // the hydrating client render both see `false` (no localStorage on the
  // server), then React re-renders with the real value — no hydration
  // mismatch even though zustand's persist rehydrates synchronously the
  // moment the store module loads.
  return useSyncExternalStore(
    subscribeHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );
}

/** Flipped by the safety-net timer so every subscriber agrees afterwards. */
let hydrationGaveUp = false;

function getHydrationSnapshot(): boolean {
  const persist = useAuth.persist;
  // No persist API means the storage was unavailable when the store was
  // created (zustand then skips the middleware entirely) — there is
  // nothing to wait for.
  return !persist || persist.hasHydrated() || hydrationGaveUp;
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

function subscribeHydration(onChange: () => void): () => void {
  const persist = useAuth.persist;
  if (!persist || persist.hasHydrated()) return () => {};
  const unsub = persist.onFinishHydration(onChange);
  // Safety net: if rehydration never finishes (zustand's hydrate() rejects
  // on unreadable storage and `hasHydrated()` then stays false forever),
  // stop showing "Loading…" and let the layout fall through to /login
  // rather than hanging indefinitely.
  const timer = window.setTimeout(() => {
    if (persist.hasHydrated()) return;
    console.warn("[auth] persisted session never finished loading; continuing signed out");
    hydrationGaveUp = true;
    onChange();
  }, 4000);
  return () => {
    unsub();
    window.clearTimeout(timer);
  };
}

/** sessionStorage flag read by /login to explain a forced sign-out. */
export const AUTH_EXPIRED_FLAG = "ayms:auth-expired";

type AdminRecoveryOutcome = "restored" | "rejected" | "unreachable";
let adminRecovery: Promise<AdminRecoveryOutcome> | null = null;

/**
 * Re-mint the password-admin's Supabase session via /api/auth/admin-session
 * (gated by the signed cookie set at password login). Deduplicated so the
 * auth-change listener and the hydration hook share one request instead of
 * racing each other.
 *
 *  - "restored":    a session was installed (SIGNED_IN follows).
 *  - "rejected":    the server refused — cookie expired, or this admin signed
 *                   in with Google and never had one. Not retryable.
 *  - "unreachable": network/config failure; worth retrying on the next load.
 */
export function recoverAdminSession(): Promise<AdminRecoveryOutcome> {
  if (adminRecovery) return adminRecovery;
  adminRecovery = (async (): Promise<AdminRecoveryOutcome> => {
    const sb = getSupabase();
    if (!sb) return "unreachable";
    try {
      const res = await fetch("/api/auth/admin-session", { method: "POST" });
      if (!res.ok) return res.status >= 500 ? "unreachable" : "rejected";
      const j = (await res.json()) as {
        ok?: boolean;
        access_token?: string;
        refresh_token?: string;
      };
      if (!j?.ok || !j.access_token || !j.refresh_token) return "rejected";
      await sb.auth.setSession({
        access_token: j.access_token,
        refresh_token: j.refresh_token,
      });
      return "restored";
    } catch {
      return "unreachable";
    } finally {
      // Keep the settled promise briefly so near-simultaneous callers share
      // it, then allow a fresh attempt (e.g. after a later SIGNED_OUT).
      window.setTimeout(() => {
        adminRecovery = null;
      }, 5_000);
    }
  })();
  return adminRecovery;
}

/** Sign the store out and leave a note for /login to show why. */
function expireStoreSession(): void {
  try {
    sessionStorage.setItem(AUTH_EXPIRED_FLAG, "1");
  } catch {
    /* storage unavailable — the redirect alone still gets them to /login */
  }
  useAuth.setState({ user: null, isAuthenticated: false });
}

/**
 * The store says "signed in" but Supabase holds no session, so every
 * RLS-guarded query comes back empty and every write is rejected — the
 * community renders as a dead shell ("It's quiet in here…" in every
 * channel). This is exactly what happened to the admin after the Sep 2026
 * Supabase outage: token refreshes failed, supabase-js dropped the session,
 * and the admin identity was deliberately kept signed-in in the store
 * (expecting the cookie re-mint), but the admin had signed in with Google
 * and never had the cookie — so the dead shell persisted for weeks.
 *
 * Resolution: the admin gets one cookie-gated re-mint attempt; if the
 * server refuses, or for any other identity, sign the store out so the
 * community layout sends them to /login, which is always recoverable.
 */
async function reconcileSessionlessIdentity(): Promise<void> {
  const state = useAuth.getState();
  if (!state.isAuthenticated && !state.user) return;
  if (state.user?.id === "admin") {
    const outcome = await recoverAdminSession();
    if (outcome === "restored") return; // SIGNED_IN will apply the user
    if (outcome === "unreachable") return; // transient — retry on next load
    // Re-check: a parallel sign-in may have landed while we waited.
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data.session) return;
    }
  }
  expireStoreSession();
}

/**
 * Self-heal the password-admin's Supabase session.
 *
 * The legacy admin login establishes its Supabase session at sign-in, but on
 * a later cold load that session can be gone (expired / never persisted),
 * leaving the browser anonymous to Supabase. RLS then hides community data
 * (channels, messages) as if it were deleted. When we detect that stale
 * state, silently re-mint the session via /api/auth/admin-session (gated by
 * the signed admin cookie) — no password re-prompt needed. If the re-mint is
 * refused, the admin is signed out to /login instead of being left in the
 * dead-shell state.
 */
export function useAdminSessionRecovery(): void {
  const hydrated = useAuthHydrated();
  useEffect(() => {
    if (!hydrated || !useSupabaseBackend) return;
    let cancelled = false;
    void (async () => {
      const sb = getSupabase();
      if (!sb) return;
      try {
        const { data } = await sb.auth.getSession();
        if (cancelled || data.session) return; // already signed in
        const st = useAuth.getState();
        if (!st.isAuthenticated || st.user?.id !== "admin") return;
        await reconcileSessionlessIdentity();
      } catch {
        /* best effort — the admin can always sign in again manually */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);
}

/**
 * Mounted once at the app shell. Listens to Firebase Auth's session
 * (which uses browserLocalPersistence by default, so it survives
 * browser restarts) and reflects the result into the Zustand store.
 *
 * This is the safety net that handles cases where:
 *   - The user cleared localStorage but Firebase still has a session
 *   - Firebase auth refreshes the token in another tab
 *   - The user signed out from another tab and we need to mirror it
 *
 * Does nothing when Firebase isn't configured (the legacy
 * localStorage flow is the source of truth in that case).
 */
export function useFirebaseAuthSync(): void {
  useEffect(() => {
    if (useSupabaseBackend) {
      return onSupabaseAuthChange((user) => {
        const state = useAuth.getState();
        if (!user) {
          // Supabase reports no session (INITIAL_SESSION on a cold load,
          // or SIGNED_OUT after a failed token refresh). Under the Supabase
          // backend NO store identity is valid without one — including
          // "admin" — so recover or sign out rather than keeping a signed-in
          // store that can't read or write anything.
          if (state.isAuthenticated || state.user) {
            void reconcileSessionlessIdentity();
          }
          return;
        }
        // The server-validated admin keeps its literal "admin" store
        // identity; the bridge session under admin@amigasymassocial.com exists only
        // to authorise Supabase writes (mirrors the Firebase guard
        // below — roles key off the literal id "admin").
        if (state.user?.id === "admin") return;
        if (state.user?.id === user.id && state.isAuthenticated) return;
        useAuth.setState({ user, isAuthenticated: true });
      });
    }
    if (!isFirebaseConfigured) return;
    const auth = getAuthInstance();
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      const state = useAuth.getState();
      if (!fbUser) {
        // Firebase says we're signed out. Mirror into Zustand UNLESS
        // the current Zustand user is non-Firebase (e.g. the legacy
        // server-side admin login, which has id "admin"). We don't
        // want a "user is null in Firebase" event to log out the
        // admin who never used Firebase Auth in the first place.
        if (state.user && !isBackendUserId(state.user.id)) return;
        if (state.isAuthenticated || state.user) {
          useAuth.setState({ user: null, isAuthenticated: false });
        }
        return;
      }
      // The legacy server-side admin (id "admin") keeps its store identity
      // even though a Firebase session runs under the admin@amigasymassocial.com
      // account. That session exists ONLY to authorise Firestore writes —
      // it must not replace the app's admin profile, because the roles
      // store keys admin permissions off the literal id "admin".
      if (state.user?.id === "admin") return;
      // Firebase says we're signed in. If Zustand already has the
      // same uid, don't clobber - the rest of the app may have
      // already loaded extra fields that aren't in Firebase yet.
      if (state.user?.id === fbUser.uid && state.isAuthenticated) return;

      try {
        const profile = await readUserProfile(fbUser.uid);
        const today = new Date().toISOString().split("T")[0];
        const restored: User = {
          id: fbUser.uid,
          name:
            profile?.name ||
            fbUser.displayName ||
            fbUser.email?.split("@")[0] ||
            "Amiga",
          email: profile?.email || fbUser.email || "",
          avatar: profile?.avatar ?? fbUser.photoURL ?? "",
          bio: profile?.bio ?? "New amiga!",
          location: profile?.location ?? "",
          joinedDate: profile?.joinedDate ?? today,
          role: profile?.role ?? "amiga",
          nameDisplay: profile?.nameDisplay ?? "full",
        };
        useAuth.setState({ user: restored, isAuthenticated: true });
        // Touch lastActiveAt so this device shows online right away.
        void upsertUserProfile(restored);
      } catch (e) {
        console.warn("[auth-sync] couldn't restore Firebase session", e);
      }
    });

    return () => unsub();
  }, []);
}

/**
 * Heuristic: backend-issued user ids are Firebase UIDs (28-char
 * alphanumeric) or Supabase auth UUIDs. The legacy server-side admin
 * login uses literal "admin", and the legacy registry uses
 * "u-<timestamp>". Anything that doesn't look like a backend uid we
 * leave alone when the auth backend reports "signed out".
 */
function isBackendUserId(id: string): boolean {
  if (!id) return false;
  if (id === "admin") return false;
  if (id.startsWith("u-")) return false;
  return (
    /^[A-Za-z0-9]{20,}$/.test(id) ||
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)
  );
}
