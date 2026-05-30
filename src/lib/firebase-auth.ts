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
export async function upsertUserProfile(user: User): Promise<void> {
  const db = getDb();
  if (!db) return;
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
  } catch (e) {
    console.warn("[firebase-auth] upsertUserProfile failed", e);
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
): Promise<User | null> {
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
  if (!isFirebaseConfigured) {
    throw new Error("Firebase isn't configured on this site.");
  }
  const auth = getAuthInstance();
  if (!auth) throw new Error("Firebase Auth isn't available.");
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Translate Firebase Auth error codes into UI-friendly messages.
 * Anything we don't recognise falls through to the raw error message.
 */
export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
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
    case "auth/too-many-requests":
      return "Too many failed attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
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
    default:
      return (err as { message?: string })?.message ?? "Something went wrong.";
  }
}
