"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth, type User } from "./store";
import {
  getAuthInstance,
  isFirebaseConfigured,
} from "./firebase";
import { useSupabaseBackend } from "./supabase";
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
  // Always start `false` so the first client render matches the server
  // (which has no localStorage). Zustand's persist rehydrates
  // synchronously the moment the store module loads — so reading
  // `hasHydrated()` in the initializer returns `true` on the very first
  // client render while the server rendered with `false`, which makes
  // React throw a hydration mismatch. Deferring the flip to a post-mount
  // effect keeps SSR and the first client render in agreement.
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    if (hydrated) return;
    if (useAuth.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuth.persist.onFinishHydration(() => setHydrated(true));
    return () => {
      unsub();
    };
  }, [hydrated]);

  return hydrated;
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
          if (state.user && !isFirebaseUserId(state.user.id)) return;
          if (state.isAuthenticated || state.user) {
            useAuth.setState({ user: null, isAuthenticated: false });
          }
          return;
        }
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
        if (state.user && !isFirebaseUserId(state.user.id)) return;
        if (state.isAuthenticated || state.user) {
          useAuth.setState({ user: null, isAuthenticated: false });
        }
        return;
      }
      // The legacy server-side admin (id "admin") keeps its store identity
      // even though a Firebase session runs under the admin@ayms.com
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
 * Heuristic: Firebase UIDs are 28-char alphanumeric. The legacy
 * server-side admin login uses literal "admin", and the legacy
 * registry uses "u-<timestamp>". Anything that doesn't look like a
 * Firebase uid we leave alone when Firebase reports "signed out".
 */
function isFirebaseUserId(id: string): boolean {
  if (!id) return false;
  if (id === "admin") return false;
  if (id.startsWith("u-")) return false;
  return /^[A-Za-z0-9]{20,}$/.test(id);
}
