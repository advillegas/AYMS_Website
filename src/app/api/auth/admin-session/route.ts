import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ADMIN_EMAIL = "admin@ayms.com";

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
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
