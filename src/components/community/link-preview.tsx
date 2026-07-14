"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Detects links in plain chat text. Three shapes, in precedence order:
 *   1. explicit scheme  — https://example.com/x
 *   2. www-prefixed     — www.example.com/x
 *   3. bare domain      — example.com/x, instagram.com/amigasymas
 * Trailing sentence punctuation is not eaten. Bare domains require a known
 * TLD and a leading lookbehind that rejects emails (foo@bar.com) and any
 * host already captured by a longer match.
 */
const TLD =
  "com|org|net|io|co|dev|app|me|gg|tv|xyz|info|biz|shop|store|social|life|link|club|us|ca|mx|es|uk|edu|gov|fm|ai|so|to|page|site";
export const URL_REGEX = new RegExp(
  [
    // 1 + 2: scheme or www.
    `(?<![@\\w])(?:https?:\\/\\/|www\\.)[^\\s<]+[^\\s<.,!?:;)\\]}'"]`,
    // 3: bare domain (not preceded by @, word char, dot or slash → skips emails/paths)
    `(?<![@\\w.\\/])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${TLD})(?:\\/[^\\s<]*[^\\s<.,!?:;)\\]}'"]|\\/?)`,
  ].join("|"),
  "gi",
);

/**
 * Normalize a detected link into an absolute href. Bare/`www.` links get an
 * `https://` scheme so the browser navigates instead of treating them as a
 * relative path. Explicit http/https links pass through untouched.
 */
export function toHref(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

interface PreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

// Simple in-memory cache to avoid re-fetching the same URL repeatedly
// across renders / messages within the same session.
const cache = new Map<string, PreviewData | null>();
const inflight = new Map<string, Promise<PreviewData | null>>();

async function fetchPreview(url: string): Promise<PreviewData | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  let p = inflight.get(url);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
        if (!res.ok) {
          cache.set(url, null);
          return null;
        }
        const data: PreviewData = await res.json();
        cache.set(url, data);
        return data;
      } catch {
        cache.set(url, null);
        return null;
      } finally {
        inflight.delete(url);
      }
    })();
    inflight.set(url, p);
  }
  return p;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
}

export function LinkPreview({ url, className }: LinkPreviewProps) {
  const [data, setData] = useState<PreviewData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchPreview(url).then((r) => {
      if (!cancelled) setData(r);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (data === undefined) {
    return (
      <div
        className={cn(
          "mt-1.5 max-w-md rounded-lg border border-rosa/20 bg-card/40 px-3 py-2 flex items-center gap-2",
          className,
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground truncate">
          Loading preview…
        </span>
      </div>
    );
  }

  if (!data || (!data.title && !data.description && !data.image)) {
    return null;
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-1.5 block max-w-md overflow-hidden rounded-lg border border-rosa/30 bg-card/60 hover:bg-card hover:border-primary/40 transition-colors",
        className,
      )}
    >
      <div className="flex">
        {data.image && (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-muted">
            <Image
              src={data.image}
              alt=""
              fill
              unoptimized
              sizes="96px"
              className="object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1 p-2.5">
          {data.siteName && (
            <p className="text-[10px] uppercase tracking-wider text-primary/70 truncate flex items-center gap-1">
              <ExternalLink className="h-2.5 w-2.5" />
              {data.siteName}
            </p>
          )}
          {data.title && (
            <p className="text-xs font-semibold text-foreground line-clamp-2 mt-0.5">
              {data.title}
            </p>
          )}
          {data.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
              {data.description}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}
