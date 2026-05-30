"use client";

import { useFirebaseAuthSync } from "@/lib/use-auth-hydrated";

/**
 * Mounted exactly once at the root layout. Owns the
 * onAuthStateChanged listener so a Firebase session that survives a
 * browser restart automatically restores the Zustand auth state on
 * cold load (and a sign-out from another tab mirrors here too).
 *
 * Render-free - just hangs an effect off the React tree.
 */
export function AuthBootstrap() {
  useFirebaseAuthSync();
  return null;
}
