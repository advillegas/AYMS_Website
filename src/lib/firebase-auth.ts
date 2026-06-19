"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  getAuthInstance,
  getDb,
  isFirebaseConfigured,
} from "./firebase";
import { useSupabaseBackend, getSupabase } from "./supabase";
import { ensureSupabaseSession } from "./ensure-session";
import { userToRow, type SupabaseUserRow } from "./supabase-user-map";
import {
  supabaseSignUp,
  supabaseSignIn,
  supabaseSignInWithGoogle,
  supabaseSignOut,
  supabaseSendPasswordReset,
  type ConfirmEmailSentinel,
} from "./supabase-auth";
import type { User } from "./store";

/**
 * Thin Firebase Auth wrapper with Firestore profile sync.
 *
 * Design notes:
 *  - The User type the rest of the app uses is the SAME shape we
 *    write to Firestore at `users/{uid}`. Firebase Auth itself only
 *    holds the email + display name + photoURL; richer fields (bio,
 *    location, role, joinedDate) live in Firestore.
 *  - All functions return `null` (or throw) gracefully when Firebase
 *    isn't configured so the legacy localStorage flow can take over.
 */

const ROLE_DEFAULT: User["role"] = "amiga";

interface FirestoreUserDoc {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate?: string;
  role?: User["role"];
  nameDisplay?: User["nameDisplay"];
  dmPrivacy?: User["dmPrivacy"];
  pronouns?: string;
  headline?: string;
  coverPhoto?: string;
  bioLong?: string;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  interests?: string[];
  languages?: string[];
  topFriendIds?: string[];
  galleryPhotos?: string[];
  emailVisibility?: User["emailVisibility"];
  profileVisibility?: User["profileVisibility"];
  geoLat?: number;
  geoLng?: number;
  manualLocations?: Array<{ label: string; lat: number; lng: number }>;
  localRadiusMiles?: number;
  eventRadiusMiles?: number;
  localChatVisibility?: "everyone" | "radius";
}

function buildUser(fbUser: FirebaseUser, doc: FirestoreUserDoc | null): User {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: fbUser.uid,
    name: doc?.name || fbUser.displayName || fbUser.email?.split("@")[0] || "Amiga",
    email: doc?.email || fbUser.email || "",
    avatar: doc?.avatar ?? fbUser.photoURL ?? "",
    bio: doc?.bio ?? "New amiga!",
    location: doc?.location ?? "",
    joinedDate: doc?.joinedDate ?? today,
    role: doc?.role ?? ROLE_DEFAULT,
    nameDisplay: doc?.nameDisplay ?? "full",
    dmPrivacy: doc?.dmPrivacy ?? "anyone",
    pronouns: doc?.pronouns,
    headline: doc?.headline,
    coverPhoto: doc?.coverPhoto,
    bioLong: doc?.bioLong,
    instagram: doc?.instagram,
    tiktok: doc?.tiktok,
    twitter: doc?.twitter,
    linkedin: doc?.linkedin,
    website: doc?.website,
    interests: doc?.interests,
    languages: doc?.languages,
    topFriendIds: doc?.topFriendIds,
    galleryPhotos: doc?.galleryPhotos,
    emailVisibility: doc?.emailVisibility,
    profileVisibility: doc?.profileVisibility,
    geoLat: doc?.geoLat,
    geoLng: doc?.geoLng,
    manualLocations: doc?.manualLocations,
    localRadiusMiles: doc?.localRadiusMiles,
    eventRadiusMiles: doc?.eventRadiusMiles,
    localChatVisibility: doc?.localChatVisibility,
  };
}

/**
 * Read a user's Firestore profile, falling back to null if it doesn't
 * exist yet.
 */
export async function readUserProfile(uid: string): Promise<FirestoreUserDoc | null> {
  if (useSupabaseBackend) {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data } = await sb.from("users").select("*").eq("id", uid).maybeSingle();
      if (!data) return null;
      const r = data as SupabaseUserRow;
      return {
        name: r.name ?? undefined,
        email: r.email ?? undefined,
        avatar: r.avatar ?? undefined,
        bio: r.bio ?? undefined,
        location: r.location ?? undefined,
        joinedDate: r.joined_date ?? undefined,
        role: (r.role ?? undefined) as User["role"] | undefined,
        nameDisplay: (r.name_display ?? undefined) as User["nameDisplay"],
        dmPrivacy: (r.dm_privacy ?? undefined) as User["dmPrivacy"],
        pronouns: r.pronouns ?? undefined,
        headline: r.headline ?? undefined,
        coverPhoto: r.cover_photo ?? undefined,
        bioLong: r.bio_long ?? undefined,
        instagram: r.instagram ?? undefined,
        tiktok: r.tiktok ?? undefined,
        twitter: r.twitter ?? undefined,
        linkedin: r.linkedin ?? undefined,
        website: r.website ?? undefined,
        interests: r.interests ?? undefined,
        languages: r.languages ?? undefined,
        topFriendIds: r.top_friend_ids ?? undefined,
        galleryPhotos: r.gallery_photos ?? undefined,
        emailVisibility: (r.email_visibility ?? undefined) as User["emailVisibility"],
        profileVisibility: (r.profile_visibility ?? undefined) as User["profileVisibility"],
        geoLat: r.geo_lat ?? undefined,
        geoLng: r.geo_lng ?? undefined,
        manualLocations: r.manual_locations ?? undefined,
        localRadiusMiles: r.local_radius_miles ?? undefined,
        eventRadiusMiles: r.event_radius_miles ?? undefined,
        localChatVisibility: (r.local_chat_visibility ?? undefined) as
          | "everyone"
          | "radius"
          | undefined,
      } as FirestoreUserDoc;
    } catch (e) {
      console.warn("[supabase-auth] readUserProfile failed", e);
      return null;
    }
  }
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data() as FirestoreUserDoc;
  } catch (e) {
    console.warn("[firebase-auth] readUserProfile failed", e);
    return null;
  }
}

/**
 * Write (merge) a user's profile to Firestore. Used on sign-up,
 * sign-in, profile-edit, and after server-side admin login.
 */
export async function upsertUserProfile(user: User): Promise<boolean> {
  if (useSupabaseBackend) {
    const sb = getSupabase();
    if (!sb) return false;
    // Guarantee an authenticated session first, otherwise the write runs as
    // `anon` and RLS silently rejects it (the original "edits don't save" bug).
    await ensureSupabaseSession(sb);
    const { error } = await sb
      .from("users")
      .upsert(userToRow(user), { onConflict: "id" });
    if (error) {
      console.warn("[supabase-auth] upsertUserProfile failed", error.message);
      return false;
    }
    return true;
  }
  const db = getDb();
  if (!db) return false;
  try {
    const data: Record<string, unknown> = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? "",
      bio: user.bio ?? "",
      location: user.location ?? "",
      role: user.role,
      joinedDate: user.joinedDate,
      nameDisplay: user.nameDisplay ?? "full",
      dmPrivacy: user.dmPrivacy ?? "anyone",
      lastActiveAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    // Only write rich profile fields if they have values so we
    // don't clobber existing data with undefined on a basic
    // sign-in that doesn't carry these fields yet.
    if (user.pronouns !== undefined) data.pronouns = user.pronouns;
    if (user.headline !== undefined) data.headline = user.headline;
    if (user.coverPhoto !== undefined) data.coverPhoto = user.coverPhoto;
    if (user.bioLong !== undefined) data.bioLong = user.bioLong;
    if (user.instagram !== undefined) data.instagram = user.instagram;
    if (user.tiktok !== undefined) data.tiktok = user.tiktok;
    if (user.twitter !== undefined) data.twitter = user.twitter;
    if (user.linkedin !== undefined) data.linkedin = user.linkedin;
    if (user.website !== undefined) data.website = user.website;
    if (user.interests !== undefined) data.interests = user.interests;
    if (user.languages !== undefined) data.languages = user.languages;
    if (user.topFriendIds !== undefined) data.topFriendIds = user.topFriendIds;
    if (user.galleryPhotos !== undefined) data.galleryPhotos = user.galleryPhotos;
    if (user.emailVisibility !== undefined) data.emailVisibility = user.emailVisibility;
    if (user.profileVisibility !== undefined) data.profileVisibility = user.profileVisibility;
    if (user.manualLocations !== undefined) data.manualLocations = user.manualLocations;
    if (user.localRadiusMiles !== undefined) data.localRadiusMiles = user.localRadiusMiles;
    if (user.eventRadiusMiles !== undefined) data.eventRadiusMiles = user.eventRadiusMiles;
    if (user.localChatVisibility !== undefined) data.localChatVisibility = user.localChatVisibility;

    await setDoc(doc(db, "users", user.id), data, { merge: true });
    return true;
  } catch (e) {
    console.warn("[firebase-auth] upsertUserProfile failed", e);
    return false;
  }
}

/**
 * Sign up via Firebase Auth and seed the user's Firestore profile.
 * Throws on failure - callers should catch and surface a friendly
 * error message.
 */
export async function firebaseSignUp(
  name: string,
  email: string,
  password: string,
): Promise<User | ConfirmEmailSentinel | null> {
  if (useSupabaseBackend) return supabaseSignUp(name, email, password);
  if (!isFirebaseConfigured) return null;
  const auth = getAuthInstance();
  if (!auth) return null;
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await fbUpdateProfile(cred.user, { displayName: name });
  const today = new Date().toISOString().split("T")[0];
  const user: User = {
    id: cred.user.uid,
    name,
    email,
    avatar: "",
    bio: "New amiga!",
    location: "",
    joinedDate: today,
    role: ROLE_DEFAULT,
  };
  await upsertUserProfile(user);
  return user;
}

/**
 * Sign in via Firebase Auth and load the Firestore profile. Returns
 * null if Firebase isn't configured (caller should fall back to the
 * legacy localStorage flow).
 */
export async function firebaseSignIn(
  email: string,
  password: string,
): Promise<User | null> {
  if (useSupabaseBackend) return supabaseSignIn(email, password);
  if (!isFirebaseConfigured) return null;
  const auth = getAuthInstance();
  if (!auth) return null;
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await readUserProfile(cred.user.uid);
  const user = buildUser(cred.user, profile);
  // Touch lastActiveAt + ensure the doc exists.
  await upsertUserProfile(user);
  return user;
}

/** Sign out of Firebase Auth (no-op when not configured). */
export async function firebaseSignOut(): Promise<void> {
  if (useSupabaseBackend) {
    await supabaseSignOut();
    return;
  }
  if (!isFirebaseConfigured) return;
  const auth = getAuthInstance();
  if (!auth) return;
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.warn("[firebase-auth] signOut failed", e);
  }
}

/**
 * Sign in (or sign up) with a Google account using a popup. Returns
 * the resolved User on success, or null when Firebase isn't
 * configured. The Firestore profile is upserted automatically so
 * Google-auth users immediately appear in the members directory.
 *
 * Throws on failure - callers should catch and run the error through
 * `friendlyAuthError` for a UI-ready message.
 */
export async function firebaseSignInWithGoogle(): Promise<User | null> {
  if (useSupabaseBackend) return supabaseSignInWithGoogle();
  if (!isFirebaseConfigured) return null;
  const auth = getAuthInstance();
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  // Always show the account chooser - prevents the "auto-signed in
  // as the wrong Google account" footgun on shared devices.
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  const fbUser = cred.user;
  // Try to load any existing Firestore profile so we preserve the
  // user's bio / location / role / nameDisplay across sign-ins.
  const profile = await readUserProfile(fbUser.uid);
  const user = buildUser(fbUser, profile);
  await upsertUserProfile(user);
  return user;
}

/**
 * Send a Firebase Auth password-reset email. The email contains a
 * link to a Firebase-hosted page where the user can set a new
 * password (or your custom action handler if configured in the
 * Firebase Console).
 *
 * Throws on failure (invalid email, user not found, network, etc.) -
 * caller should run errors through `friendlyAuthError`.
 */
export async function firebaseSendPasswordReset(email: string): Promise<void> {
  if (useSupabaseBackend) {
    await supabaseSendPasswordReset(email);
    return;
  }
  if (!isFirebaseConfigured) {
    throw new Error("Firebase isn't configured on this site.");
  }
  const auth = getAuthInstance();
  if (!auth) throw new Error("Firebase Auth isn't available.");
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Canonical admin email. The server-side admin login (/api/auth/login,
 * ADMIN_PASSWORD) authenticates the *UI* but creates no Firebase
 * identity — so Firestore writes guarded by isAdmin() (events, calendar
 * feeds, testimonials, config) were denied. This bridges that gap.
 *
 * MUST stay in sync with the email hard-coded in firestore.rules
 * `isAdminEmail()`.
 */
export const ADMIN_EMAIL = "admin@amigasymassocial.com";

/**
 * Establish a real Firebase Auth session for the admin so client-side
 * admin writes satisfy the Firestore security rules. Called right after
 * the server validates the admin password.
 *
 * Idempotent + best-effort: signs in under ADMIN_EMAIL (auto-provisioning
 * the account on first login), then seeds the users/{uid} profile with
 * role 'admin'. Any failure is logged and swallowed — the UI keeps
 * working; admin Firestore writes just stay denied until a session
 * exists.
 *
 * The Firebase admin account reuses the password the admin typed (the
 * one the server checked against ADMIN_PASSWORD). Rotating ADMIN_PASSWORD
 * therefore means updating this account's password too (Firebase Console
 * → Authentication).
 */
export async function ensureFirebaseAdminSession(
  password: string,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  const auth = getAuthInstance();
  if (!auth) return;

  // Already signed in as the admin account — just refresh the profile.
  if (auth.currentUser?.email === ADMIN_EMAIL) {
    if (!useSupabaseBackend) await writeAdminProfile(auth.currentUser.uid);
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
      // First admin login on this Firebase project: provision the account.
      try {
        await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      } catch (e2) {
        const c2 = (e2 as { code?: string })?.code ?? "";
        if (c2 === "auth/email-already-in-use") {
          // Loud on purpose: the UI admin login SUCCEEDED but Firestore
          // writes will fail without this session — a silent warn here
          // reads as "admin works" while every admin mutation bounces.
          console.error(
            "[admin-bridge] ADMIN MUTATIONS WILL FAIL: Firebase admin account " +
              "exists but ADMIN_PASSWORD doesn't match it. Reset it in Firebase " +
              "Console → Authentication (or set ADMIN_PASSWORD to match).",
          );
        } else {
          console.error("[admin-bridge] couldn't provision Firebase admin account", e2);
        }
        return;
      }
    } else if (code === "auth/wrong-password") {
      console.error(
        "[admin-bridge] ADMIN MUTATIONS WILL FAIL: Firebase admin account " +
          "exists but the password differs from ADMIN_PASSWORD. Update it in " +
          "Firebase Console → Authentication.",
      );
      return;
    } else {
      console.warn("[admin-bridge] Firebase admin sign-in failed", e);
      return;
    }
  }

  // Under the Supabase backend the role='admin' users row is seeded
  // server-side (service role) by /api/auth/login — a client upsert
  // keyed by the FIREBASE uid would just trip the users_role_guard
  // trigger and pollute the table with a stray row.
  const u = auth.currentUser;
  if (u && !useSupabaseBackend) await writeAdminProfile(u.uid);
}

/** Seed/refresh the admin's Firestore profile with role 'admin'. */
async function writeAdminProfile(uid: string): Promise<void> {
  await upsertUserProfile({
    id: uid,
    name: "AYMS Admin",
    email: ADMIN_EMAIL,
    avatar: "",
    bio: "Site administrator",
    location: "AYMS HQ",
    joinedDate: "2026-01-01",
    role: "admin",
    nameDisplay: "full",
    dmPrivacy: "anyone",
  });
}

/**
 * Translate Firebase Auth (`auth/*`) and Supabase GoTrue error codes
 * into UI-friendly messages. Anything we don't recognise falls through
 * to the raw error message.
 */
export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    // ---- Supabase GoTrue codes (AuthApiError.code) ----
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "user_already_exists":
    case "email_exists":
      return "An account with that email already exists. Try signing in instead.";
    case "weak_password":
      return "Password must be at least 6 characters.";
    case "email_not_confirmed":
      return "Confirm your email first — check your inbox for the confirmation link.";
    case "user_not_found":
      return "No account found with that email.";
    case "user_banned":
      return "This account has been disabled. Contact an admin for help.";
    case "same_password":
      return "Your new password must be different from the current one.";
    case "otp_expired":
      return "That link has expired. Request a new one and try again.";
    case "over_email_send_rate_limit":
      return "We've emailed that address too recently. Wait a few minutes and try again.";
    case "over_request_rate_limit":
      return "Too many attempts. Try again in a few minutes.";
    case "signup_disabled":
      return "New sign-ups are currently disabled. Contact an admin.";
    case "session_expired":
    case "session_not_found":
      return "Your session has expired. Please sign in again.";
    case "validation_failed":
      return "That doesn't look like a valid email address.";
    // ---- Firebase Auth codes ----
    case "auth/email-already-in-use":
      return "An account with that email already exists. Try signing in instead.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact an admin for help.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Try again in a few minutes, or reset your password.";
    case "auth/requires-recent-login":
      return "For your security, please sign in again to continue.";
    case "auth/network-request-failed":
    case "auth/timeout":
      return "Network error. Check your connection and try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled before it finished.";
    case "auth/account-exists-with-different-credential":
      return "An account with that email already exists using a different sign-in method. Try signing in with the original method.";
    case "auth/unauthorized-domain":
      return "This site isn't authorized for Google sign-in yet. An admin needs to add the domain in Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
      // These both mean the sign-in provider hasn't been enabled in
      // the Firebase Console. The most common cause for new projects.
      return "This sign-in method isn't enabled yet. Open Firebase Console → Authentication → Sign-in method and enable Email/Password (and Google for Gmail sign-in).";
    case "auth/missing-email":
      return "Enter your email address first.";
    case "auth/internal-error":
      return "Something went wrong on our end. Please try again.";
    default: {
      // Fall through to the raw message, but strip Firebase's noisy
      // "Firebase: ... (auth/code)." wrapper so users don't see
      // internal codes when we don't have a specific mapping.
      const raw = (err as { message?: string })?.message;
      if (raw) {
        const cleaned = raw
          .replace(/^Firebase:\s*/i, "")
          .replace(/\s*\(auth\/[^)]+\)\.?$/i, "")
          .trim();
        if (cleaned) return cleaned;
      }
      return "Something went wrong. Please try again.";
    }
  }
}
