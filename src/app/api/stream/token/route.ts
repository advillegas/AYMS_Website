import { NextResponse } from "next/server";
import { StreamClient } from "@stream-io/node-sdk";
import {
  FIREBASE_AUTH_ENABLED,
  verifyFirebaseIdToken,
  readBearerToken,
} from "@/lib/firebase-verify";
import { useSupabaseBackend } from "@/lib/supabase";
import { getServiceClient } from "@/lib/supabase-server";
import {
  verifySupabaseToken,
  resolveCanonicalUserIdByEmail,
} from "@/lib/supabase-verify";

/**
 * Mints a short-lived JWT for the requesting user so the Stream Video
 * client SDK can authenticate against the Stream service.
 *
 * Auth model:
 *  - The API key (NEXT_PUBLIC_STREAM_API_KEY) is safe to ship to the
 *    browser - it identifies your Stream app, not the user.
 *  - The API secret (STREAM_API_SECRET) is server-only and signs the
 *    JWT. NEVER expose it client-side or via a NEXT_PUBLIC_ env.
 *  - Tokens carry the user_id claim and an exp claim 1 hour out, so a
 *    leaked token can only impersonate one user for a bounded window.
 *  - Under the Supabase backend the caller MUST send a valid Supabase
 *    access token; the verified email resolves to the canonical
 *    users.id, which becomes the Stream user id. NEVER the Supabase
 *    auth uuid — migrated members' canonical ids are their original
 *    Firebase UIDs, and minting for the uuid would fork their Stream
 *    identity.
 *  - Otherwise, when Firebase auth is configured the caller MUST send
 *    a valid Firebase ID token (Authorization: Bearer <token>); the
 *    verified uid becomes the Stream user id and any body id is
 *    ignored. With no auth backend (local dev) it falls back to the
 *    body id.
 */

interface TokenPayload {
  userId?: string;
  userName?: string;
  image?: string;
}

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "Stream Video is not configured. Set NEXT_PUBLIC_STREAM_API_KEY and STREAM_API_SECRET.",
      },
      { status: 503 },
    );
  }

  let body: TokenPayload;
  try {
    body = (await request.json()) as TokenPayload;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  // The body-id fallback exists for LOCAL DEV ONLY (no auth backend).
  // In production an unauthenticated caller could otherwise mint a token
  // for any user id and join calls as them — refuse outright instead.
  if (
    !FIREBASE_AUTH_ENABLED &&
    !useSupabaseBackend &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.json(
      { error: "Video calls require an auth backend to be configured." },
      { status: 503 },
    );
  }

  // Resolve the *trusted* identity. With an auth backend live we ignore
  // the body id entirely and trust only the verified token identity.
  let trustedId = (body.userId ?? "").trim();
  if (useSupabaseBackend) {
    const accessToken = readBearerToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Authentication required to join the room." },
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
    if (!getServiceClient()) {
      return NextResponse.json(
        {
          error:
            "Video calls require server Supabase credentials. Set SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 503 },
      );
    }
    // Stream identity continuity: mint for the canonical users.id
    // (original Firebase UID for migrated members), never the auth uuid.
    const canonicalId = verified.email
      ? await resolveCanonicalUserIdByEmail(verified.email)
      : null;
    if (!canonicalId) {
      return NextResponse.json(
        { error: "Couldn't resolve your member profile. Please sign in again." },
        { status: 403 },
      );
    }
    trustedId = canonicalId;
  } else if (FIREBASE_AUTH_ENABLED) {
    const idToken = readBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Authentication required to join the room." },
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
    trustedId = uid;
  }

  if (!trustedId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Stream allows letters, numbers, underscore, dash. Sanitize to match -
  // users created via our local auth might have characters outside that set.
  const safeUserId = trustedId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);

  try {
    const client = new StreamClient(apiKey, apiSecret);

    // Upsert the user in Stream so their name + avatar show in calls.
    await client.upsertUsers([
      {
        id: safeUserId,
        name: body.userName ?? "AYMS Member",
        image: body.image,
      },
    ]);

    const now = Math.floor(Date.now() / 1000);
    const token = client.generateUserToken({
      user_id: safeUserId,
      validity_in_seconds: TOKEN_TTL_SECONDS,
      iat: now,
    });

    return NextResponse.json({
      apiKey,
      token,
      userId: safeUserId,
      ttl: TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    console.error("[stream/token] failed to mint token", err);
    return NextResponse.json(
      { error: "Failed to mint Stream token" },
      { status: 500 },
    );
  }
}
