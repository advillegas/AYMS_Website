/**
 * Admin-triggered "Sync now" proxy.
 *
 * The browser must NEVER hold the cron secret. The admin calendar page calls
 * this endpoint (authenticated with the caller's Firebase ID token, when auth
 * is configured); the server then injects CRON_SECRET and forwards to the
 * real sync job. This keeps the secret server-side only.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  FIREBASE_AUTH_ENABLED,
  verifyFirebaseIdToken,
  readBearerToken,
} from "@/lib/firebase-verify";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Require a valid Firebase session when auth is configured.
  if (FIREBASE_AUTH_ENABLED) {
    const idToken = readBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    const uid = await verifyFirebaseIdToken(idToken);
    if (!uid) {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 },
      );
    }
  }

  // Best-effort abuse guard: syncing hits external iCal URLs + writes Firestore.
  const limit = rateLimit(`sync-now:${clientIp(request)}`, 6, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many sync requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const cronSecret = process.env.CRON_SECRET;

  // Forward to the real sync job, injecting the secret server-side.
  try {
    const resp = await fetch(`${request.nextUrl.origin}/api/calendar/sync`, {
      method: "POST",
      headers: cronSecret ? { authorization: `Bearer ${cronSecret}` } : {},
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (err) {
    console.error("[sync-now] proxy failed", err);
    return NextResponse.json(
      { error: "Sync could not be started. Please try again." },
      { status: 502 },
    );
  }
}
