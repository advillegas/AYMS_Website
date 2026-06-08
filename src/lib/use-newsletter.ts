"use client";

/**
 * Firestore-backed newsletter / lead capture.
 *
 * Mirrors the structure of use-events.ts: a graceful Firebase guard, a
 * realtime read subscription for the admin audience panel, and a write
 * helper that the public landing forms call.
 *
 * IMPORTANT: this layer only CAPTURES + PERSISTS signups. It does NOT
 * send any email and is not wired to an email service provider (ESP).
 * The owner connects an ESP later by reading the `newsletterSignups`
 * collection. De-duping happens here by querying for the email before
 * writing so the same address is never stored twice.
 *
 * When Firebase isn't configured the `subscribe` helper still resolves
 * successfully ("local" status) so the marketing forms degrade cleanly
 * during local development.
 */

import { useEffect, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";

/* ------------------------------------------------------------------ */
/* Firestore schema                                                    */
/* ------------------------------------------------------------------ */

export type NewsletterSource =
  | "contact"
  | "footer"
  | "waitlist"
  | "featured";

export interface NewsletterSignup {
  id: string;
  email: string;
  name?: string;
  source: NewsletterSource;
  tripId?: string;
  locale: string;
  status: "active";
  createdAt?: string;
}

interface NewsletterSignupDoc {
  email?: string;
  name?: string | null;
  source?: string;
  tripId?: string | null;
  locale?: string;
  status?: string;
  createdAt?: Timestamp;
}

export interface SubscribeInput {
  email: string;
  name?: string;
  source: NewsletterSource;
  tripId?: string;
  locale?: string;
}

export type SubscribeStatus =
  | "subscribed" // newly written to Firestore
  | "exists" // already on the list (de-duped)
  | "local" // Firebase not configured — accepted, not persisted
  | "error";

export interface SubscribeResult {
  status: SubscribeStatus;
  message: string;
}

const COLLECTION = "newsletterSignups";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tsToIso(t: Timestamp | undefined | null): string {
  if (!t) return "";
  try {
    return t.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToSignup(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): NewsletterSignup {
  const data = d.data() as NewsletterSignupDoc;
  return {
    id: d.id,
    email: data.email ?? "",
    name: data.name ?? undefined,
    source: (data.source as NewsletterSource) ?? "contact",
    tripId: data.tripId ?? undefined,
    locale: data.locale ?? "en",
    status: "active",
    createdAt: tsToIso(data.createdAt),
  };
}

/* ------------------------------------------------------------------ */
/* Standalone subscribe (used by forms + reused by the API route's    */
/* client fallback). Performs an email de-dupe query before writing.  */
/* ------------------------------------------------------------------ */

export async function subscribeToNewsletter(
  input: SubscribeInput,
): Promise<SubscribeResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  // Firebase not configured: accept gracefully so the UI still works.
  if (!isFirebaseConfigured) {
    return {
      status: "local",
      message: "You're on the list! ♡",
    };
  }

  const db = getDb();
  if (!db) {
    return { status: "local", message: "You're on the list! ♡" };
  }

  try {
    // De-dupe by email: query before write so we never store a dup.
    const existing = await getDocs(
      query(collection(db, COLLECTION), where("email", "==", email), limit(1)),
    );
    if (!existing.empty) {
      return {
        status: "exists",
        message: "You're already on the list — gracias! ♡",
      };
    }

    await addDoc(collection(db, COLLECTION), {
      email,
      // Firestore rejects `undefined` — store explicit null instead.
      name: input.name?.trim() || null,
      source: input.source,
      tripId: input.tripId ?? null,
      locale: input.locale ?? "en",
      status: "active",
      createdAt: serverTimestamp(),
    });

    return { status: "subscribed", message: "You're on the list! ♡" };
  } catch (err) {
    console.error("[newsletter] subscribe failed", err);
    return {
      status: "error",
      message: "Something went wrong. Please try again.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Form hook                                                           */
/* ------------------------------------------------------------------ */

export interface UseNewsletterResult {
  submitting: boolean;
  subscribe: (input: SubscribeInput) => Promise<SubscribeResult>;
}

/**
 * Thin hook around `subscribeToNewsletter` that tracks an in-flight
 * `submitting` flag for the landing forms. Prefers the server API route
 * (rate-limited) and falls back to a direct client write when the route
 * is unreachable so the form never hard-fails for the visitor.
 */
export function useNewsletter(): UseNewsletterResult {
  const [submitting, setSubmitting] = useState(false);

  const subscribe = useCallback(
    async (input: SubscribeInput): Promise<SubscribeResult> => {
      setSubmitting(true);
      try {
        // Try the rate-limited API route first.
        try {
          const res = await fetch("/api/newsletter/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const data = (await res.json().catch(() => null)) as
            | SubscribeResult
            | { error?: string }
            | null;

          if (res.ok && data && "status" in data) {
            return data as SubscribeResult;
          }
          if (res.status === 429) {
            return {
              status: "error",
              message: "Too many attempts — please try again in a moment.",
            };
          }
          if (res.status === 400 && data && "error" in data && data.error) {
            return { status: "error", message: data.error };
          }
          // Any other server problem: fall through to the client write.
        } catch {
          // Network error — fall through to the client write.
        }

        // Fallback: write directly from the client (also de-dupes).
        return await subscribeToNewsletter(input);
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { submitting, subscribe };
}

/* ------------------------------------------------------------------ */
/* Admin read hook (realtime audience list)                            */
/* ------------------------------------------------------------------ */

export interface UseNewsletterListResult {
  signups: NewsletterSignup[];
  loading: boolean;
  isFirestore: boolean;
}

export function useNewsletterList(): UseNewsletterListResult {
  const [signups, setSignups] = useState<NewsletterSignup[]>([]);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const isFirestore = isFirebaseConfigured;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    // No orderBy on the query (avoids composite-index requirements);
    // sort client-side by createdAt desc.
    const q = query(collection(db, COLLECTION), limit(1000));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToSignup)
          .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        setSignups(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[newsletter] snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { signups, loading, isFirestore };
}
