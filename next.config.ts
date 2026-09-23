import type { NextConfig } from "next";

// Supabase Storage host, derived from the configured project so the image
// allow-list can't drift from the backend. Falls back to the production ref
// for builds that run without env vars.
const supabaseHost = (() => {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return u ? new URL(u).hostname : "erklhkrpdqyshwrkuxmf.supabase.co";
  } catch {
    return "erklhkrpdqyshwrkuxmf.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  // Next 16.1+ enables Turbopack's filesystem cache for `next dev` by default.
  // On this project's ExFAT volume the cache persistence directory fails to
  // load ("invalid digit found in string"), which crashes the dev server.
  // Disable it for dev to keep `next dev` stable. Production build is unaffected.
  experimental: {
    turbopackFileSystemCacheForDev: false,
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    // ExFAT dev volume breaks Next's image optimizer, so opt out in dev only;
    // production builds keep full optimization.
    unoptimized: process.env.NODE_ENV === "development",
    // Keep optimized variants for 31 days. Uploaded photos never change at
    // a given URL (unique upload paths, upsert:false), so a long TTL is safe
    // and it matters twice over:
    //  • Supabase bills Storage downloads as "cached egress" (Free plan:
    //    5 GB/month). Exceeding it made Supabase return 402 for EVERY API
    //    call in Sep 2026 and took the site down. With a 31-day TTL Vercel
    //    fetches each source image from Supabase ~once a month instead of
    //    every 4 hours (the Next default).
    //  • Vercel Hobby allows 5,000 image transformations/month, and a
    //    variant is re-transformed each time its cache expires.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      // GIPHY GIFs rendered in the community chat
      { protocol: "https", hostname: "media.giphy.com" },
      { protocol: "https", hostname: "media0.giphy.com" },
      { protocol: "https", hostname: "media1.giphy.com" },
      { protocol: "https", hostname: "media2.giphy.com" },
      { protocol: "https", hostname: "media3.giphy.com" },
      { protocol: "https", hostname: "media4.giphy.com" },
      { protocol: "https", hostname: "i.giphy.com" },
      // Firebase Storage download URLs (profile photos, etc.)
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      // Supabase Storage public objects (media bucket). Must stay in sync
      // with OPTIMIZABLE_HOSTS in src/lib/optimized-image.tsx.
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      // Stream Video default avatars + uploaded user images
      { protocol: "https", hostname: "getstream.io" },
      { protocol: "https", hostname: "stream-io-cdn.com" },
      { protocol: "https", hostname: "us-east.stream-io-cdn.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/calendar/feed.ics",
        destination: "/api/calendar/feed",
      },
    ];
  },
  async headers() {
    return [
      {
        // Calendar feed: open CORS so Google/Apple/Outlook can fetch it
        source: "/api/calendar/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Conservative CSP subset: blocks plugin embeds, base-tag
            // hijacks, framing, and external form posts WITHOUT a
            // script-src/connect-src (which would need constant curation
            // for Firebase/Stream/GIPHY and break the app if it drifts).
            key: "Content-Security-Policy",
            value:
              "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
