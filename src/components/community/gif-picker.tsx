"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GifAttachment } from "@/lib/use-firebase-chat";
import { FloatingPopover, type PopoverPlacement } from "./floating-popover";

/**
 * GIPHY GIF picker. Loads trending GIFs by default; lets the user
 * search. Requires NEXT_PUBLIC_GIPHY_API_KEY (free at
 * https://developers.giphy.com/dashboard).
 *
 * Renders via portal so it floats above the chat sidebars.
 */

interface GiphyImageRendition {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height_small?: GiphyImageRendition;
    fixed_height?: GiphyImageRendition;
    fixed_width?: GiphyImageRendition;
    original?: GiphyImageRendition;
  };
}

interface GiphyResponse {
  data: GiphyGif[];
}

interface GifPickerButtonProps {
  onSelect: (attachment: GifAttachment) => void;
  disabled?: boolean;
  placement?: PopoverPlacement;
}

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
const SEARCH_DEBOUNCE_MS = 350;
const POPOVER_WIDTH = 380;

async function fetchGifs(query: string): Promise<GiphyGif[]> {
  if (!API_KEY) return [];
  const endpoint = query.trim()
    ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(query.trim())}&limit=24&rating=pg-13`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=24&rating=pg-13`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    let detail = "";
    try {
      const json = (await res.json()) as { message?: string };
      detail = json?.message ? ` — ${json.message}` : "";
    } catch {
      // ignore json parse error
    }
    throw new Error(`GIPHY ${res.status}${detail}`);
  }
  const json = (await res.json()) as GiphyResponse;
  return json.data;
}

export function GifPickerButton({
  onSelect,
  disabled,
  placement = "top-start",
}: GifPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setLoading(true);
      setErr(null);
      fetchGifs(query)
        .then(setGifs)
        .catch((e) =>
          setErr(e instanceof Error ? e.message : "Failed to load GIFs"),
        )
        .finally(() => setLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [open, query]);

  if (!API_KEY) return null;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10"
        aria-label="Insert GIF"
        title="Insert GIF"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      <FloatingPopover
        open={open}
        triggerRef={triggerRef}
        onClose={() => setOpen(false)}
        placement={placement}
        width={POPOVER_WIDTH}
        className="overflow-hidden border border-rosa/30 bg-card"
      >
        <div
          style={{ width: POPOVER_WIDTH }}
          className="max-h-[420px] flex flex-col"
        >
          <div className="border-b border-rosa/20 p-2 bg-gradient-to-r from-rosa/15 to-blush/15">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search GIPHY…"
                className="pl-8 h-8 text-xs border-rosa/30 bg-background"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            {err && !loading && (
              <div className="px-3 py-4 text-center text-xs text-destructive">
                {err}
              </div>
            )}
            {!loading && !err && gifs.length === 0 && (
              <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                No GIFs found
              </div>
            )}
            {!loading && !err && gifs.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {gifs.map((gif) => {
                  const small =
                    gif.images.fixed_width ??
                    gif.images.fixed_height_small ??
                    gif.images.fixed_height;
                  const original = gif.images.original;
                  if (!small || !original) return null;
                  return (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => {
                        onSelect({
                          type: "gif",
                          url: original.url,
                          width: parseInt(original.width, 10),
                          height: parseInt(original.height, 10),
                          title: gif.title,
                        });
                        setOpen(false);
                      }}
                      className="relative group overflow-hidden rounded-md border border-transparent hover:border-primary/40 hover:ring-2 hover:ring-primary/20 transition-all"
                    >
                      <Image
                        src={small.url}
                        alt={gif.title}
                        width={parseInt(small.width, 10)}
                        height={parseInt(small.height, 10)}
                        unoptimized
                        className="w-full h-auto block"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border-t border-rosa/20 px-3 py-1.5 text-[9px] text-muted-foreground text-center bg-muted/30">
            Powered by GIPHY
          </div>
        </div>
      </FloatingPopover>
    </>
  );
}
