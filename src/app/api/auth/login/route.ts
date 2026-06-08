import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Server-side credential validator for the admin account.
 *
 * Runs only on the server (Route Handler), so the admin password and
 * any future secrets stay out of the client bundle. Configure the
 * password by setting ADMIN_PASSWORD in .env.local (or in your Vercel
 * project's environment variables for production).
 *
 * The endpoint also responds when an unknown username is provided so
 * the client can fall back to its local user registry without a second
 * round-trip.
 */

const ADMIN_USERNAMES = new Set(["admin", "admin@ayms.com"]);

/** Constant-time credential comparison (avoids timing enumeration). */
function safeEqual(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

interface LoginPayload {
  identifier?: string;
  password?: string;
}

export async function POST(request: Request) {
  let body: LoginPayload;
  try {
    body = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Malformed request body" },
      { status: 400 },
    );
  }

  const identifier = (body.identifier ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json(
      { ok: false, error: "Username and password are required" },
      { status: 400 },
    );
  }

  const isAdminAttempt = ADMIN_USERNAMES.has(identifier);
  if (!isAdminAttempt) {
    // Not an admin login - tell the client to fall back to local registry.
    return NextResponse.json({ ok: false, fallback: true });
  }

  // Throttle admin password attempts per IP to blunt brute-force.
  const limit = rateLimit(`login:admin:${clientIp(request)}`, 8, 5 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again in a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    // Fail closed: refuse admin auth when no password is configured server-side.
    return NextResponse.json(
      { ok: false, error: "Admin login is not configured" },
      { status: 503 },
    );
  }
  if (!safeEqual(password, expected)) {
    return NextResponse.json(
      { ok: false, error: "Invalid admin credentials" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: "admin",
      name: "AYMS Admin",
      email: "admin@ayms.com",
      avatar: "",
      bio: "Site administrator",
      location: "AYMS HQ",
      joinedDate: "2026-01-01",
      role: "admin" as const,
    },
  });
}
