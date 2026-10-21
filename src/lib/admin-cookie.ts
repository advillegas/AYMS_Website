/**
 * Server-only signed marker proving a browser passed the ADMIN_PASSWORD
 * check. It lets /api/auth/admin-session safely re-mint the admin's
 * Supabase session on reload (so the legacy password-admin never silently
 * drops to an anonymous session, which RLS would treat as "no data").
 *
 * Format: `<issued-at-seconds>.<hmac-sha256-hex>` where the HMAC covers
 * "admin:<issued-at>" under a server secret. The timestamp is what makes
 * the marker expire server-side: a browser's Max-Age is advisory only, and
 * a leaked constant-value cookie would otherwise re-mint admin sessions
 * until the secret was rotated. Can't be forged client-side.
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

function mac(issuedAt: number): string {
  return createHmac("sha256", secret())
    .update(`admin:${issuedAt}`)
    .digest("hex");
}

export function signAdminCookie(now = Date.now()): string {
  const issuedAt = Math.floor(now / 1000);
  return `${issuedAt}.${mac(issuedAt)}`;
}

export function verifyAdminCookie(
  value: string | undefined | null,
  now = Date.now(),
): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false; // legacy constant-format cookie: re-login once
  const issuedAt = Number(value.slice(0, dot));
  if (!Number.isInteger(issuedAt)) return false;
  const ageSeconds = Math.floor(now / 1000) - issuedAt;
  if (ageSeconds < 0 || ageSeconds > ADMIN_COOKIE_MAX_AGE) return false;
  try {
    const a = Buffer.from(value.slice(dot + 1));
    const b = Buffer.from(mac(issuedAt));
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
