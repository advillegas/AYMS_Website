import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { buildSystemPrompt } from "@/lib/chatbot-system-prompt";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ------------------------------------------------------------------ */
/* Live site data — grounds the bot in the current Supabase content   */
/* (published trips + the events calendar, incl. Google-Calendar      */
/* synced events) so it never serves stale prices/dates/availability. */
/* ------------------------------------------------------------------ */

interface TripRow {
  title: string | null;
  destination: string | null;
  dates: string | null;
  duration: string | null;
  price: number | null;
  deposit: number | null;
  status: string | null;
  spots_left: number | null;
  published: boolean | null;
  sort_order: number | null;
}

interface EventRow {
  title: string | null;
  date: string | null;
  end_date: string | null;
  start_time: string | null;
  location: string | null;
  type: string | null;
  published: boolean | null;
}

function prettyDate(iso: string): string {
  // Build at noon UTC so the calendar day never shifts across timezones.
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusLabel(status: string | null, spotsLeft: number | null): string {
  switch (status) {
    case "sold-out":
      return "SOLD OUT";
    case "waitlist":
      return "Waitlist only";
    case "coming-soon":
      return "Coming soon";
    default:
      return typeof spotsLeft === "number" && spotsLeft > 0 && spotsLeft <= 8
        ? `Only ${spotsLeft} spots left`
        : "Booking open";
  }
}

/** Returns { liveTrips, liveEvents, extraKnowledge } blocks, or empty strings. */
async function fetchLiveContext(): Promise<{
  liveTrips: string;
  liveEvents: string;
  extraKnowledge: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { liveTrips: "", liveEvents: "", extraKnowledge: "" };

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const todayIso = new Date().toISOString().slice(0, 10);

    const [tripsRes, eventsRes, chatbotRes] = await Promise.all([
      sb
        .from("trips")
        .select(
          "title,destination,dates,duration,price,deposit,status,spots_left,published,sort_order",
        )
        .limit(100),
      sb
        .from("events")
        .select("title,date,end_date,start_time,location,type,published")
        .gte("date", todayIso)
        .order("date", { ascending: true })
        .limit(30),
      // Owner-authored bot notes from Admin → Content → Chatbot.
      sb.from("cms_config").select("value").eq("key", "chatbot").maybeSingle(),
    ]);

    let liveTrips = "";
    if (!tripsRes.error && Array.isArray(tripsRes.data)) {
      const rows = (tripsRes.data as TripRow[])
        .filter((t) => t.published !== false && t.title)
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
      if (rows.length > 0) {
        const lines = rows.map((t) => {
          const price = typeof t.price === "number" ? `$${t.price.toLocaleString()}` : "—";
          const deposit = typeof t.deposit === "number" ? `$${t.deposit.toLocaleString()}` : "—";
          return `| **${t.title}** | ${t.destination ?? ""} | ${t.dates ?? "TBA"} | ${t.duration ?? ""} | **${price}** | ${deposit} | ${statusLabel(t.status, t.spots_left)} |`;
        });
        liveTrips = `## Live trips (current source of truth)\n| Trip | Destination | Dates | Length | Price | Deposit | Status |\n|---|---|---|---|---|---|---|\n${lines.join("\n")}`;
      }
    }

    let liveEvents = "";
    if (!eventsRes.error && Array.isArray(eventsRes.data)) {
      const rows = (eventsRes.data as EventRow[]).filter(
        (e) =>
          e.published !== false &&
          e.title &&
          e.date &&
          // Camp has its own authoritative section + /camp page; drop any
          // (sometimes stale/duplicate) calendar entries so the bot can't
          // contradict the canonical Aug 28–30 dates.
          !/summer\s*camp/i.test(e.title),
      );
      if (rows.length > 0) {
        const lines = rows.map((e) => {
          const when = e.end_date && e.end_date !== e.date
            ? `${prettyDate(e.date as string)}–${prettyDate(e.end_date)}`
            : prettyDate(e.date as string);
          const where = e.location ? ` — ${e.location}` : "";
          const time = e.start_time ? ` (${e.start_time})` : "";
          return `- **${when}** — ${e.title}${where}${time}`;
        });
        liveEvents = `## Live events (current calendar — includes Google-Calendar synced events)\n${lines.join("\n")}`;
      }
    }

    let extraKnowledge = "";
    if (!chatbotRes.error && chatbotRes.data) {
      const v = (chatbotRes.data as { value?: { extraKnowledge?: unknown } }).value;
      if (v && typeof v.extraKnowledge === "string") extraKnowledge = v.extraKnowledge;
    }

    return { liveTrips, liveEvents, extraKnowledge };
  } catch (err) {
    console.warn("[chat] live context fetch failed", err);
    return { liveTrips: "", liveEvents: "", extraKnowledge: "" };
  }
}

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

  // Bound the raw payload BEFORE parsing — the 24-turn slice below caps
  // message count, but without a byte cap a single crafted 1MB message
  // would still hit the model and burn token budget.
  const raw = await req.text();
  if (raw.length > 64_000) {
    return new Response(
      JSON.stringify({ error: "Message too long — please shorten it." }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }
  let body: { messages?: UIMessage[] };
  try {
    body = JSON.parse(raw);
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

  // Ground the bot in current site data (published trips + upcoming
  // calendar events + owner notes). Falls back to the static baseline on
  // any failure.
  const { liveTrips, liveEvents, extraKnowledge } = await fetchLiveContext();

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    system: buildSystemPrompt({ liveTrips, liveEvents, extraKnowledge }),
    messages: modelMessages,
    // Lower temperature → tighter adherence to the scope-lock + anti-
    // injection rules (less creative drift on adversarial prompts).
    temperature: 0.3,
    maxOutputTokens: 800,
  });

  return result.toUIMessageStreamResponse();
}
