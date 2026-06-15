/**
 * Firebase initialization for the AYMS community chat.
 *
 * Reads NEXT_PUBLIC_FIREBASE_* environment variables. If any are
 * missing the chat falls back to the in-memory Zustand store so the
 * site still works during local development without a configured
 * Firebase project.
 *
 * Setup:
 *   1. Create a project at https://console.firebase.google.com
 *   2. Add a Web app, copy its config object.
 *   3. Enable Firestore (start in test mode for dev, lock down rules
 *      before launch - see firestore.rules below).
 *   4. Paste the config values into .env.local using the keys in
 *      .env.example.
 *
 * Suggested Firestore security rules (production):
 *   match /messages/{id} {
 *     allow read: if request.auth != null;
 *     allow create: if request.auth != null
 *                   && request.resource.data.userId == request.auth.uid;
 *   }
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.appId,
);

/**
 * Storage requires the storageBucket value in addition to the basic
 * Firebase config. We track this separately so the UI can disable
 * upload affordances when Storage isn't usable but the rest of
 * Firebase still is.
 */
export const isStorageConfigured = Boolean(
  isFirebaseConfigured && config.storageBucket,
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

function getApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (app) return app;
  app = getApps()[0] ?? initializeApp(config as Record<string, string>);
  return app;
}

export function getDb(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  if (db) return db;
  const a = getApp();
  if (!a) return null;
  db = getFirestore(a);
  return db;
}

export function getStorageInstance(): FirebaseStorage | null {
  if (!isStorageConfigured) return null;
  if (storage) return storage;
  const a = getApp();
  if (!a) return null;
  storage = getStorage(a);
  return storage;
}

export function getAuthInstance(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (auth) return auth;
  const a = getApp();
  if (!a) return null;
  auth = getAuth(a);
  return auth;
}

/**
 * The uid Firestore security rules actually check (`request.auth.uid`).
 *
 * This is NOT always the same as the Zustand store's `user.id`: the
 * server-side admin login keeps the literal id "admin" in the store,
 * while its bridged Firebase session runs under the admin@amigasymassocial.com
 * account's real uid. Any write guarded by `== request.auth.uid`
 * (meetup hostId, rsvp doc id, …) must use THIS value, not user.id, or
 * the rules deny it. Returns null when no Firebase session exists.
 */
export function getCurrentUid(): string | null {
  return getAuthInstance()?.currentUser?.uid ?? null;
}
