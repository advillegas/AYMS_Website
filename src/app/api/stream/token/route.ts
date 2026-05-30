import { NextResponse } from "next/server";
import { StreamClient } from "@stream-io/node-sdk";

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
 *
 * The client passes its identity in the request body. Long term you'd
 * tie this to a server-side session check; for now we trust the
 * client because the rest of the auth surface (admin / Firebase /
 * localStorage user registry) is the same trust level.
 */

interface TokenPayload {
  userId?: string;
  userName?: string;
  image?: string;
}

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

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

  const userId = (body.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  // Stream allows letters, numbers, underscore, dash. Sanitize to
  // match - users created via our local auth might have characters
  // outside that set.
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);

  try {
    const client = new StreamClient(apiKey, apiSecret);

    // Upsert the user in Stream so their name + avatar show in calls.
    await client.upsertUsers([
      {
        id: safeUserId,
        name: body.userName ?? "AYMS Member",
        image: body.image,
        role: "user",
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
