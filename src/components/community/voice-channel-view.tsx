"use client";

import dynamic from "next/dynamic";
import { Mic, Video, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { RichChannel } from "@/lib/use-channels-store";
import { useHasPermission } from "@/lib/use-roles-store";

const STREAM_DOCS = "https://getstream.io/video/";

interface VoiceChannelViewProps {
  channel: RichChannel;
}

const STREAM_CONFIGURED = !!process.env.NEXT_PUBLIC_STREAM_API_KEY;

/**
 * Lazy-loaded so the Stream SDK (~hefty) is only fetched when a user
 * actually opens a voice or video channel. ssr: false is required -
 * Stream uses WebRTC primitives that don't exist on the server.
 */
const StreamRoom = dynamic(() => import("./stream-room"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
        <p className="text-xs text-muted-foreground">Loading room…</p>
      </div>
    </div>
  ),
});

export function VoiceChannelView({ channel }: VoiceChannelViewProps) {
  const isVideo = channel.type === "video";
  const Icon = isVideo ? Video : Mic;
  const canUse = useHasPermission(isVideo ? "useVideo" : "useVoice");

  if (!STREAM_CONFIGURED) {
    return <StreamUnconfigured channel={channel} />;
  }

  if (!canUse) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-rosa/20 px-4 bg-gradient-to-r from-card to-rosa/10">
          <Icon className="h-4 w-4 text-primary/70" />
          <h2 className="font-semibold font-[family-name:var(--font-heading)]">
            {channel.name}
          </h2>
        </div>
        <div className="flex-1 grid place-items-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-2">
              <AlertTriangle className="h-7 w-7 text-amber-600 mx-auto" />
              <p className="text-sm font-semibold">
                You don&apos;t have permission to join this room
              </p>
              <p className="text-xs text-muted-foreground">
                Ask an admin for the {isVideo ? "useVideo" : "useVoice"}{" "}
                permission.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <StreamRoom channel={channel} />;
}

function StreamUnconfigured({ channel }: VoiceChannelViewProps) {
  const isVideo = channel.type === "video";
  const Icon = isVideo ? Video : Mic;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-rosa/20 px-4 bg-gradient-to-r from-card to-rosa/10">
        <Icon className="h-4 w-4 text-primary/70" />
        <h2 className="font-semibold font-[family-name:var(--font-heading)]">
          {channel.name}
        </h2>
        <span className="text-xs text-muted-foreground hidden sm:inline truncate">
          — {channel.description}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {isVideo ? "Video room" : "Voice room"}
        </span>
      </div>

      <div className="flex-1 grid place-items-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-rosa/30 grid place-items-center">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-[family-name:var(--font-heading)]">
                {channel.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {channel.description}
              </p>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900/80 dark:text-amber-200/80">
                  <p className="font-semibold mb-0.5">Stream Video not configured</p>
                  <p>
                    Add{" "}
                    <code className="px-1 rounded bg-amber-500/15 font-mono text-[10px]">
                      NEXT_PUBLIC_STREAM_API_KEY
                    </code>{" "}
                    and{" "}
                    <code className="px-1 rounded bg-amber-500/15 font-mono text-[10px]">
                      STREAM_API_SECRET
                    </code>{" "}
                    to your environment to enable voice and video.
                  </p>
                </div>
              </div>
            </div>

            <a
              href={STREAM_DOCS}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
            >
              Stream Video setup
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
