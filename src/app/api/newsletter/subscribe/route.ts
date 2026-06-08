/**
 * Newsletter / lead capture endpoint.
 *
 * CAPTURE + PERSIST ONLY. This route validates the payload, throttles by
 * client IP, de-dupes by email, and writes a `newsletterSignups` document
 * to Firestore. It deliberately does NOT send any email and is not wired
 * to an email service provider — the owner connects an ESP later by
 * reading the collection.
 *
 * House patterns followed:
 *  - zod body validation at the boundary
 *  - src/lib/rate-limit.ts per-IP throttle (NextResponse + Retry-After)
 *  - runtime "nodejs" (Firebase client SDK + serverTimestamp)
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  addDoc,
  collection,
  getDocs,
  limit as fsLimit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
// Type-only import (erased at runtime) — keeps this server route off the
// client module boundary while reusing the canonical result shape.
import type { SubscribeResult } from "@/lib/use-newsletter";

export const runtime = "nodejs";

const COLLECTION = "newsletterSignups";

const SOURCES = ["contact", "footer", "waitlist", "featured"] as const;

const BodySchema = z.object({
  // Trim + lowercase BEFORE validating (zod v4 runs `.trim()` as a
  // post-transform, so we pipe into the email check instead). This also
  // normalizes the address so the Firestore de-dupe stays consistent.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Invalid email address."))
    .pipe(z.string().max(320)),
  name: z.string().trim().max(120).optional(),
  source: z.enum(SOURCES).default("contact"),
  tripId: z.string().trim().max(120).optional(),
  locale: z.string().trim().max(10).optional(),
});

export async function POST(request: NextRequest) {
  // Best-effort abuse guard: 5 signups per IP per minute.
  const limit = rateLimit(`newsletter:${clientIp(request)}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid request.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const { email, name, source, tripId, locale } = parsed.data;

  // Firebase not configured: accept gracefully so the UI still works.
  if (!isFirebaseConfigured) {
    const result: SubscribeResult = {
      status: "local",
      message: "You're on the list! ♡",
    };
    return NextResponse.json(result, { status: 200 });
  }

  const db = getDb();
  if (!db) {
    const result: SubscribeResult = {
      status: "local",
      message: "You're on the list! ♡",
    };
    return NextResponse.json(result, { status: 200 });
  }

  try {
    // De-dupe by email: query before write so we never store a duplicate.
    const existing = await getDocs(
      query(
        collection(db, COLLECTION),
        where("email", "==", email),
        fsLimit(1),
      ),
    );
    if (!existing.empty) {
      const result: SubscribeResult = {
        status: "exists",
        message: "You're already on the list — gracias! ♡",
      };
      return NextResponse.json(result, { status: 200 });
    }

    await addDoc(collection(db, COLLECTION), {
      email,
      // Firestore rejects `undefined` — store explicit null instead.
      name: name?.trim() || null,
      source,
      tripId: tripId ?? null,
      locale: locale ?? "en",
      status: "active",
      createdAt: serverTimestamp(),
    });

    const result: SubscribeResult = {
      status: "subscribed",
      message: "You're on the list! ♡",
    };
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[newsletter] subscribe failed", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
