import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { useSupabaseBackend } from "@/lib/supabase";
import { getServiceClient } from "@/lib/supabase-server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE,
  signAdminCookie,
} from "@/lib/admin-cookie";

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
const ADMIN_EMAIL = "admin@ayms.com";

/** Constant-time credential comparison (avoids timing enumeration). */
function safeEqual(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

/**
 * Neutralize legacy Firebase-era admin profile rows. Every Firebase
 * admin login wrote a Firestore users/{firebaseUid} doc with email
 * admin@ayms.com (writeAdminProfile), and the migration imports it
 * verbatim — so the canonical {id:'admin'} seed below would violate the
 * unique lower(email) index (and users_auth_id_key, once
 * link_auth_identity has bound the admin JWT to the legacy row). Blank
 * both columns on any such row instead of insisting the seed wins the
 * index: the shell row keeps its id harmlessly (admin content was
 * always keyed by the literal store id 'admin', so nothing references
 * the Firebase uid). Idempotent — matches zero rows once reconciled.
 */
async function reconcileLegacyAdminRows(svc: SupabaseClient): Promise<void> {
  // ADMIN_EMAIL contains no ilike metacharacters, so this is an exact
  // case-insensitive match — same semantics as lower(email) = '...'.
  const { error } = await svc
    .from("users")
    .update({ email: "", auth_id: null })
    .neq("id", "admin")
    .ilike("email", ADMIN_EMAIL);
  if (error) {
    console.warn("[auth/login] legacy admin row reconcile failed", error);
  }
}

/**
 * Supabase admin bridge: after ADMIN_PASSWORD validates, make sure a
 * real Supabase Auth user exists for admin@ayms.com with that password
 * (so the client can establish a session RLS can see) and seed the
 * canonical users row with role='admin' — only the service role may
 * write admin roles (users_role_guard trigger). Server-side
 * provisioning also prevents account-squatting on the admin email.
 * Idempotent; returns false when the service key is unconfigured or
 * provisioning fails (login itself must never block on this).
 */
async function provisionSupabaseAdmin(password: string): Promise<boolean> {
  const svc = getServiceClient();
  if (!svc) return false;
  try {
    let authUserId: string | null = null;
    const { data: created, error: createErr } =
      await svc.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password,
        email_confirm: true,
      });
    if (createErr) {
      const exists =
        createErr.code === "email_exists" ||
        createErr.code === "user_already_exists" ||
        createErr.status === 422;
      if (!exists) throw createErr;
      // Already provisioned — sync the password to ADMIN_PASSWORD. The
      // admin API has no get-by-email, so page through listUsers.
      for (let page = 1; page <= 10 && !authUserId; page++) {
        const { data: listed, error: listErr } =
          await svc.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) throw listErr;
        authUserId =
          listed.users.find(
            (u) => (u.email ?? "").toLowerCase() === ADMIN_EMAIL,
          )?.id ?? null;
        if (listed.users.length < 200) break;
      }
      if (!authUserId) throw new Error("admin auth user not found");
      const { error: updateErr } = await svc.auth.admin.updateUserById(
        authUserId,
        { password, email_confirm: true },
      );
      if (updateErr) throw updateErr;
    } else {
      authUserId = created.user?.id ?? null;
    }

    const seedAdminRow = () =>
      svc.from("users").upsert(
        {
          id: "admin",
          name: "AYMS Admin",
          email: ADMIN_EMAIL,
          role: "admin",
          ...(authUserId ? { auth_id: authUserId } : {}),
        },
        { onConflict: "id" },
      );

    await reconcileLegacyAdminRows(svc);
    let { error: upsertErr } = await seedAdminRow();
    if (upsertErr && upsertErr.code === "23505") {
      // A colliding row slipped past (or appeared after) the reconcile —
      // clear it and retry once rather than failing the bridge.
      await reconcileLegacyAdminRows(svc);
      ({ error: upsertErr } = await seedAdminRow());
    }
    if (upsertErr) throw upsertErr;
    return true;
  } catch (err) {
    // Log unique-index collisions distinctly so a 23505 isn't
    // misdiagnosed as a missing SUPABASE_SERVICE_ROLE_KEY (the usual
    // cause of adminBridge:'unavailable' per MIGRATION.md).
    const code = (err as { code?: unknown } | null)?.code;
    console.warn(
      code === "23505"
        ? "[auth/login] Supabase admin bridge failed: users unique-index collision (23505) on the admin email — legacy row could not be reconciled"
        : "[auth/login] Supabase admin bridge failed",
      err,
    );
    return false;
  }
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

  // Provision the Supabase-side admin identity (auth user + users row).
  // Never blocks login: the synthetic admin user below keeps the UI
  // working; adminBridge tells the client whether a Supabase session
  // can be established.
  const adminBridge = useSupabaseBackend
    ? (await provisionSupabaseAdmin(password))
      ? ("ok" as const)
      : ("unavailable" as const)
    : undefined;

  const response = NextResponse.json({
    ok: true,
    ...(adminBridge ? { adminBridge } : {}),
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

  // Signed proof of admin sign-in so /api/auth/admin-session can silently
  // re-establish the Supabase session on later reloads (prevents the
  // "everything looks deleted" anonymous-session state).
  response.cookies.set(ADMIN_COOKIE_NAME, signAdminCookie(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  return response;
}
