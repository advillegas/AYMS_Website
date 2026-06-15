/**
 * Server-only signed marker proving a browser passed the ADMIN_PASSWORD
 * check. It lets /api/auth/admin-session safely re-mint the admin's
 * Supabase session on reload (so the legacy password-admin never silently
 * drops to an anonymous session, which RLS would treat as "no data").
 *
 * The cookie carries no secret of its own — just an HMAC over a fixed
 * subject keyed by a server secret, so it can't be forged client-side.
 * Must never be imported from a "use client" module.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "ayms_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ADMIN_PASSWORD ||
    "ayms-admin-cookie-fallback"
  );
}

export function signAdminCookie(): string {
  return createHmac("sha256", secret()).update("admin").digest("hex");
}

export function verifyAdminCookie(value: string | undefined | null): boolean {
  if (!value) return false;
  const expected = signAdminCookie();
  try {
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
