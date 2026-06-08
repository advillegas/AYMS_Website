import type { MetadataRoute } from "next";

/**
 * Web App Manifest (PWA basics + theme-color).
 *
 * Next 16 serves this from /manifest.webmanifest and auto-links it from the
 * document head. Adds installability, a branded splash (background_color)
 * and a branded mobile browser chrome (theme_color) — none of which existed
 * before. Colors mirror the design tokens in globals.css
 * (--brand-pink #B51760 on the warm --background #FFF7FB).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amigas Y Más Social — Latina Travel Community",
    short_name: "Amigas Y Más",
    description:
      "The Latina travel community where you find your new amigas. " +
      "Group trips, events, and sisterhood — connect, empower, celebrate.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF7FB",
    theme_color: "#B51760",
    lang: "en",
    categories: ["travel", "social", "lifestyle"],
    icons: [
      {
        src: "/ayms-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
