import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { buildSystemPrompt } from "@/lib/chatbot-system-prompt";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Chat completion endpoint backing the floating AYMS chatbot.
 *
 * - Uses Claude Haiku via Anthropic for low-latency, low-cost replies.
 * - The system prompt encodes every fact the bot is allowed to use
 *   plus strict no-hallucination guardrails (see chatbot-system-prompt.ts).
 * - ANTHROPIC_API_KEY must be set in .env.local (or Vercel project env).
 * - Streams the response so the widget can render token-by-token.
 */
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "AYMS chatbot is not configured. Set ANTHROPIC_API_KEY in .env.local to enable AI replies.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Per-IP throttle so a single client can't drain the API budget.
  const limit = rateLimit(`chat:${clientIp(req)}`, 20, 60_000);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: "You're sending messages too fast — please slow down a moment.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Malformed request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Cap history so a crafted client can't send a huge backlog and blow up
  // token cost. Keep the most recent turns only.
  const messages = (Array.isArray(body.messages) ? body.messages : []).slice(
    -24,
  );
  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "No messages provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    system: buildSystemPrompt(),
    messages: modelMessages,
    temperature: 0.5,
    maxOutputTokens: 800,
  });

  return result.toUIMessageStreamResponse();
}
