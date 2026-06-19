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

/**
 * True when a string is actually a link (full URL, mailto/tel, site-relative
 * path, or a bare domain like "example.com/pay") rather than plain button copy
 * like "Book Now". Used to recover from a link pasted into the wrong field.
 */
export function looksLikeUrl(s: string | undefined | null): boolean {
  const t = (s ?? "").trim();
  if (!t) return false;
  if (/^(https?:|mailto:|tel:)/i.test(t) || t.startsWith("/")) return true;
  // bare domain with no spaces, e.g. www.amigasymas.com or pay.site.co/x
  return !/\s/.test(t) && /^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(t);
}

/**
 * Resolve a trip's single call-to-action from its (possibly mis-entered)
 * booking fields. Returns the href to open (or null for the in-app hold) and
 * a safe button label that is never a raw URL.
 *
 * Forgiving by design: if the link was pasted into the "button text" field, we
 * still treat it as the link; if the label is itself a URL, we fall back to
 * "Book Now" so the button never shows a raw address.
 */
export function resolveBooking(
  bookingUrl?: string | null,
  bookingLabel?: string | null,
): { url: string | null; label: string } {
  const rawLabel = (bookingLabel ?? "").trim();
  const labelIsUrl = looksLikeUrl(rawLabel);

  let url = ensureHttp(bookingUrl);
  if (!url && labelIsUrl) url = ensureHttp(rawLabel);

  const label = rawLabel && !labelIsUrl ? rawLabel : "Book Now";
  return { url: url || null, label };
}
