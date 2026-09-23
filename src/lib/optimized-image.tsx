/**
 * Route Storage-hosted images through Next/Vercel Image Optimization.
 *
 * Why this exists: every photo an admin or member uploads lives in Supabase
 * Storage. Rendering those URLs raw (or via next/image with `unoptimized`)
 * makes EVERY visitor download the full-resolution original (~1–2.5 MB after
 * the cropper) straight from Supabase, which Supabase meters as "cached
 * egress". The Free plan allows 5 GB/month. In Sep 2026 the site exceeded it
 * and Supabase answered every API call — auth, CMS, community, storage —
 * with 402 `exceed_cached_egress_quota`, taking the whole site down.
 *
 * With optimization on, Vercel fetches the source from Supabase ONCE per
 * size variant, then serves a resized WebP from its edge cache for
 * `images.minimumCacheTTL` (31 days — see next.config.ts). Per-visitor
 * egress becomes per-month egress.
 *
 * Safety: only the storage hosts below (which must stay in sync with
 * `images.remotePatterns` in next.config.ts) are ever optimized. data:/blob:
 * previews, local /public assets, GIPHY, and arbitrary pasted URLs pass
 * through untouched, so nothing can 400 at the optimizer.
 */

import { getImageProps } from "next/image";
import type { ImgHTMLAttributes } from "react";

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Storage hosts whose images are routed through the optimizer. */
const OPTIMIZABLE_HOSTS: ReadonlySet<string> = new Set(
  [
    // Active Supabase project (inlined at build from NEXT_PUBLIC_SUPABASE_URL).
    hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL),
    // Explicit fallback so a build without env vars still matches production.
    "erklhkrpdqyshwrkuxmf.supabase.co",
    // Legacy Firebase Storage URLs (pre-migration profile photos etc.).
    "firebasestorage.googleapis.com",
  ].filter((h): h is string => Boolean(h)),
);

/**
 * True when `src` is an https URL on a storage host we optimize. Use as
 * `unoptimized={!isOptimizableImageUrl(src)}` on next/image so uploaded
 * photos get optimized while everything else keeps its current behavior.
 */
export function isOptimizableImageUrl(src: unknown): src is string {
  if (typeof src !== "string" || !src.startsWith("https://")) return false;
  const host = hostOf(src);
  return host !== null && OPTIMIZABLE_HOSTS.has(host);
}

/**
 * `src`/`srcSet`/`sizes` for a plain <img> so it loads through the optimizer
 * when the URL qualifies. `sizes` should describe the rendered width (e.g.
 * "400px" or "(max-width: 768px) 100vw, 1200px") so the browser picks the
 * smallest adequate variant. Non-optimizable URLs come back unchanged.
 */
export function optimizedImgProps(
  src: string,
  sizes: string,
): Pick<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes"> {
  if (!isOptimizableImageUrl(src)) return { src };
  const { props } = getImageProps({ src, alt: "", fill: true, sizes });
  return {
    src: props.src,
    srcSet: props.srcSet,
    sizes: props.srcSet ? props.sizes : undefined,
  };
}

type OptimizedImgProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet"
> & {
  src: string;
  /** Rendered-width hint for srcset selection; defaults to full viewport. */
  sizes?: string;
};

/**
 * Drop-in replacement for <img>. Layout is still 100% CSS-driven (auto
 * width, aspect-ratio frames, object-fit/position all work as before) —
 * only the bytes change: storage URLs are served resized + cached from
 * Vercel instead of raw from Supabase.
 */
export function OptimizedImg({
  src,
  sizes = "100vw",
  alt = "",
  loading = "lazy",
  decoding = "async",
  ...rest
}: OptimizedImgProps) {
  const optimized = optimizedImgProps(src, sizes);
  // Deliberately a plain <img>: builder elements size themselves with CSS
  // (auto width, fixed-height strips, aspect-ratio frames) that next/image's
  // layout modes can't express. The optimizer URL is what matters here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} loading={loading} decoding={decoding} {...rest} {...optimized} />;
}
