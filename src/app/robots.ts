import type { MetadataRoute } from "next";

const DISALLOW = ["/community/", "/admin/", "/api/"];

/**
 * AI assistant / answer-engine crawlers we explicitly welcome, so AYMS can be
 * read, cited, and recommended by ChatGPT, Claude, Gemini, Perplexity, Copilot,
 * and friends. (They still can't see the private /community + /admin areas.)
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "Meta-ExternalAgent",
  "FacebookBot",
  "cohere-ai",
  "DuckAssistBot",
  "YouBot",
  "Diffbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
    ],
    sitemap: "https://amigasymassocial.com/sitemap.xml",
    host: "https://amigasymassocial.com",
  };
}
