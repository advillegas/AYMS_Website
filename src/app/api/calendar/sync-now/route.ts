/**
 * Admin-triggered "Sync now" proxy.
 *
 * The browser must NEVER hold the cron secret. The admin calendar page calls
 * this endpoint (authenticated with the caller's Supabase access token or
 * Firebase ID token, depending on the active backend); the server then
 * injects CRON_SECRET and forwards to the real sync job. This keeps the
 * secret server-side only.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  FIREBASE_AUTH_ENABLED,
  verifyFirebaseIdToken,
  readBearerToken,
} from "@/lib/firebase-verify";
import { useSupabaseBackend } from "@/lib/supabase";
import {
  verifySupabaseToken,
  resolveAppUserByEmail,
  emailHasPermission,
} from "@/lib/supabase-verify";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (useSupabaseBackend) {
    // Require a valid Supabase session AND admin role: this endpoint
    // triggers external fetches plus event writes/deletes.
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    const verified = await verifySupabaseToken(accessToken);
    if (!verified) {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 },
      );
    }
    // auth.uid() ≠ users.id for migrated members — resolve the canonical
    // row by the verified email claim to check access. Allowed if the
    // caller is an admin OR holds the `manageCalendar` role permission
    // (so a non-admin role granted calendar management can sync too).
    const email = (verified.email ?? "").trim().toLowerCase();
    const appUser = email ? await resolveAppUserByEmail(email) : null;
    const isAdmin = email === "admin@amigasymassocial.com" || appUser?.role === "admin";
    const canManageCalendar =
      isAdmin || (email ? await emailHasPermission(email, "manageCalendar") : false);
    if (!canManageCalendar) {
      return NextResponse.json(
        { error: "You need the Manage calendar permission to sync feeds." },
        { status: 403 },
      );
    }
  } else if (FIREBASE_AUTH_ENABLED) {
    // Require a valid Firebase session when Firebase auth is configured.
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
  } else {
    // No auth backend configured: refuse rather than run anonymously.
    return NextResponse.json(
      { error: "Manual sync requires an auth backend to be configured." },
      { status: 503 },
    );
  }

  // Best-effort abuse guard: syncing hits external iCal URLs + writes events.
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
