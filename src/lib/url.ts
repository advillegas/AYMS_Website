/**
 * Normalize an admin-pasted link into a usable href. Leaves absolute URLs,
 * site-relative paths, and mailto:/tel: alone; prefixes a bare domain
 * ("example.com/pay") with https:// so the link always works.
 */
export function ensureHttp(url: string | undefined | null): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  if (/^(https?:|mailto:|tel:)/i.test(u) || u.startsWith("/") || u.startsWith("#")) {
    return u;
  }
  return `https://${u}`;
}
