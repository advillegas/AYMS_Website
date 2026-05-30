import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
        ],
      },
    ];
  },
};

export default nextConfig;
