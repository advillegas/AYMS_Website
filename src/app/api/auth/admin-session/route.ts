import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ADMIN_EMAIL = "admin@amigasymassocial.com";

/**
 * Re-mint the admin's Supabase session on demand.
 *
 * The password-only admin login establishes its Supabase session client-side
 * at sign-in; on a later reload that session can be missing/expired, which
 * would make RLS-guarded community data (channels, messages) look empty — as
 * if everything was deleted. This endpoint lets the client silently restore
 * that session WITHOUT re-prompting for the password, gated by the signed
 * admin cookie set at login (so only a verified admin can mint it).
 */
export async function POST(request: Request) {
  const jar = await cookies();
  if (!verifyAdminCookie(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const limit = rateLimit(`admin-session:${clientIp(request)}`, 20, 5 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const password = process.env.ADMIN_PASSWORD;
  if (!url || !anon || !password) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  // Fresh client per request (no shared/persisted session state).
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password,
  });
  if (error || !data.session) {
    // Tell the client whether this is worth retrying. Supabase refusing the
    // credentials (ADMIN_PASSWORD rotated without a password login, auth
    // user missing) is permanent until the admin signs in with the
    // password again → 401, and the client signs the store out. Supabase
    // unreachable / 5xx is transient → 502, and the client keeps its state
    // for the next load.
    const status = (error as { status?: number } | null)?.status ?? 0;
    const upstreamDown = !error || status === 0 || status >= 500;
    return NextResponse.json(
      { ok: false, reason: upstreamDown ? "upstream" : "credentials" },
      { status: upstreamDown ? 502 : 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}

/**
 * Sign-out hook: drop the admin marker so THIS browser can no longer
 * re-mint an admin session without the password. Without it, anyone at a
 * signed-out admin's keyboard could restore full admin access for up to
 * 30 days just by making the client store claim to be "admin".
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
