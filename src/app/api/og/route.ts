import { NextResponse } from "next/server";

/**
 * Open Graph metadata fetcher used by the chat link preview cards.
 *
 * Fetches the target URL server-side, parses the &lt;head&gt;'s OG tags
 * (plus a couple of common fallbacks like Twitter cards and the
 * &lt;title&gt; element), and returns a small JSON envelope.
 *
 * Notes:
 *  - 5 second timeout to avoid hanging on dead URLs.
 *  - 200 KB cap on the body we read so a malicious server can't make
 *    us download a giant payload.
 *  - Cache-control allows the response to be cached for an hour at
 *    the edge, which keeps repeated previews snappy.
 */

export const runtime = "edge";

interface PreviewResult {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const TIMEOUT_MS = 5_000;
const MAX_BYTES = 200 * 1024;

function pick(html: string, regex: RegExp): string | undefined {
  const m = html.match(regex);
  if (!m) return undefined;
  // Decode the most common HTML entities. (Full decode would require a
  // dependency; this covers ~99% of the meta-tag cases.)
  return m[1]
    ?.replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function metaContent(html: string, prop: string): string | undefined {
  // Match either <meta property="..."> or <meta name="...">.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const r = pick(html, re);
  if (r) return r;
  // Reverse attribute order also seen in the wild.
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
    "i",
  );
  return pick(html, re2);
}

function absolutize(maybe: string | undefined, base: URL): string | undefined {
  if (!maybe) return undefined;
  try {
    return new URL(maybe, base).toString();
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only http(s) URLs are supported" },
      { status: 400 },
    );
  }
  // Block requests to private / loopback hosts to mitigate SSRF.
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
  ) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      headers: {
        // Some sites only return OG tags when they think a real
        // browser is asking.
        "User-Agent":
          "Mozilla/5.0 (compatible; AYMS-LinkPreview/1.0; +https://ayms.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: 502 },
      );
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    let html = "";
    if (reader) {
      let read = 0;
      // We only need the &lt;head&gt;, so we can stop once we see the
      // closing tag - but we cap on bytes too in case &lt;/head&gt; is
      // missing or absurdly far in.
      while (read < MAX_BYTES) {
        const chunk = await reader.read();
        if (chunk.done) break;
        read += chunk.value.byteLength;
        html += decoder.decode(chunk.value, { stream: true });
        if (html.includes("</head>")) break;
      }
      try {
        await reader.cancel();
      } catch {
        /* noop */
      }
    }

    const title =
      metaContent(html, "og:title") ??
      metaContent(html, "twitter:title") ??
      pick(html, /<title>([^<]+)<\/title>/i);
    const description =
      metaContent(html, "og:description") ??
      metaContent(html, "twitter:description") ??
      metaContent(html, "description");
    const image =
      metaContent(html, "og:image") ?? metaContent(html, "twitter:image");
    const siteName =
      metaContent(html, "og:site_name") ?? parsed.hostname.replace(/^www\./, "");

    const out: PreviewResult = {
      url: parsed.toString(),
      title: title?.slice(0, 200),
      description: description?.slice(0, 300),
      image: absolutize(image, parsed),
      siteName: siteName?.slice(0, 80),
    };

    return NextResponse.json(out, {
      headers: {
        // Cache for 1 hour at the edge, allow stale-while-revalidate
        // for 1 day so re-paste of the same URL feels instant.
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400, max-age=600",
      },
    });
  } catch (e) {
    const reason =
      e instanceof Error && e.name === "AbortError"
        ? "Upstream timed out"
        : "Fetch failed";
    return NextResponse.json({ error: reason }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
