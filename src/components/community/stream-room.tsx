"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  SpeakerLayout,
  CallControls,
  CallParticipantsList,
  CallingState,
  useCallStateHooks,
  type Call,
  type User as StreamUser,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";

import { useAuth } from "@/lib/store";
import { getAuthInstance } from "@/lib/firebase";
import { getSupabase, useSupabaseBackend } from "@/lib/supabase";
import type { RichChannel } from "@/lib/use-channels-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  Video,
  AlertTriangle,
  Loader2,
  Users,
  PhoneOff,
} from "lucide-react";

interface StreamRoomProps {
  channel: RichChannel;
}

/**
 * Real Stream Video room for voice + video channels. Lazy-mounted by
 * VoiceChannelView so the (large) Stream SDK is only fetched when a
 * user actually opens a voice or video channel.
 *
 * Lifecycle:
 *  1. Mount with the channel + auth user. Render a "ready to join"
 *     pre-join screen.
 *  2. User clicks Join -> we fetch a token from /api/stream/token,
 *     instantiate a StreamVideoClient, create/join the call by id =
 *     channel.id, and flip the UI into the in-call layout.
 *  3. User clicks leave (or unmounts / navigates away) -> we call
 *     leave() + disconnectUser() so we don't hold a media session
 *     in the background.
 *
 * Channel type only changes the default camera-on state. Both voice
 * and video channels use call type "default" so everyone can talk and
 * anyone can toggle their camera mid-call (Discord behavior).
 */
export default function StreamRoom({ channel }: StreamRoomProps) {
  const user = useAuth((s) => s.user);
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [phase, setPhase] = useState<"idle" | "joining" | "joined" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  // Refs let the cleanup effect read the latest client/call without
  // capturing them in its dependency array (re-runs would tear down a
  // live call mid-use otherwise).
  const clientRef = useRef<StreamVideoClient | null>(null);
  const callRef = useRef<Call | null>(null);

  const isVideoChannel = channel.type === "video";

  const teardown = useCallback(async () => {
    const c = callRef.current;
    const cl = clientRef.current;
    callRef.current = null;
    clientRef.current = null;
    if (c) {
      try {
        if (
          c.state.callingState !== CallingState.LEFT &&
          c.state.callingState !== CallingState.IDLE
        ) {
          await c.leave();
        }
      } catch (err) {
        console.warn("[stream-room] leave failed", err);
      }
    }
    if (cl) {
      try {
        await cl.disconnectUser();
      } catch (err) {
        console.warn("[stream-room] disconnect failed", err);
      }
    }
  }, []);

  // On unmount, tear everything down. Also fires when the channel
  // changes - parent passes a new key (we read it via channel.id).
  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  const handleJoin = useCallback(async () => {
    if (!user) {
      setError("Sign in to join the room.");
      setPhase("error");
      return;
    }
    setPhase("joining");
    setError(null);
    try {
      // Attach the active backend's token so the server can verify
      // identity instead of trusting the body. Local/dev (no backend)
      // users have no token; the server allows that path only when no
      // auth backend is configured.
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      try {
        if (useSupabaseBackend) {
          const accessToken = (await getSupabase()?.auth.getSession())?.data
            .session?.access_token;
          if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
        } else {
          const idToken = await getAuthInstance()?.currentUser?.getIdToken();
          if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
        }
      } catch {
        /* no session — fall through */
      }
      const tokenResp = await fetch("/api/stream/token", {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          image: user.avatar,
        }),
      });
      if (!tokenResp.ok) {
        const detail = await tokenResp.json().catch(() => null);
        throw new Error(
          detail?.error ?? `Token request failed (${tokenResp.status})`,
        );
      }
      const { apiKey, token, userId } = (await tokenResp.json()) as {
        apiKey: string;
        token: string;
        userId: string;
      };

      const streamUser: StreamUser = {
        id: userId,
        name: user.name,
        image: user.avatar || undefined,
      };

      const newClient = new StreamVideoClient({
        apiKey,
        user: streamUser,
        token,
      });
      clientRef.current = newClient;

      const newCall = newClient.call("default", channel.id);
      callRef.current = newCall;

      await newCall.join({
        create: true,
        data: {
          // Custom call metadata - keeps the channel context alongside
          // the Stream record for analytics / future moderation.
          custom: {
            channelName: channel.name,
            channelType: channel.type,
            ayms: true,
          },
        },
      });

      // Default camera off for voice channels; users can toggle.
      if (!isVideoChannel) {
        try {
          await newCall.camera.disable();
        } catch {
          /* fine if no camera yet */
        }
      }

      setClient(newClient);
      setCall(newCall);
      setPhase("joined");
    } catch (err) {
      console.error("[stream-room] join failed", err);
      setError(err instanceof Error ? err.message : "Couldn't join the room.");
      setPhase("error");
      await teardown();
    }
  }, [user, channel.id, channel.name, channel.type, isVideoChannel, teardown]);

  const handleLeave = useCallback(async () => {
    await teardown();
    setClient(null);
    setCall(null);
    setPhase("idle");
  }, [teardown]);

  const Icon = isVideoChannel ? Video : Mic;

  // Pre-join screen
  if (phase !== "joined" || !client || !call) {
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
            {isVideoChannel ? "Video room" : "Voice room"}
          </span>
        </div>
        <div className="flex-1 grid place-items-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-rosa/30 grid place-items-center">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-[family-name:var(--font-heading)]">
                  {channel.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {channel.description ||
                    `Drop in to ${isVideoChannel ? "stream and chat" : "talk"} with the community.`}
                </p>
              </div>
              {phase === "error" && error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-left text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                onClick={handleJoin}
                disabled={phase === "joining" || !user}
                className="w-full bg-gradient-to-r from-primary to-magenta text-white"
                size="lg"
              >
                {phase === "joining" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <Icon className="h-4 w-4 mr-2" />
                    Join {isVideoChannel ? "video" : "voice"}
                  </>
                )}
              </Button>
              {!user && (
                <p className="text-[11px] text-muted-foreground">
                  Sign in to join the room.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // In-call screen
  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <RoomShell
          channel={channel}
          isVideoChannel={isVideoChannel}
          onLeave={handleLeave}
        />
      </StreamCall>
    </StreamVideo>
  );
}

interface RoomShellProps {
  channel: RichChannel;
  isVideoChannel: boolean;
  onLeave: () => void;
}

function RoomShell({ channel, isVideoChannel, onLeave }: RoomShellProps) {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const [showParticipants, setShowParticipants] = useState(false);

  const Icon = isVideoChannel ? Video : Mic;

  if (
    callingState === CallingState.JOINING ||
    callingState === CallingState.RECONNECTING
  ) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            {callingState === CallingState.RECONNECTING
              ? "Reconnecting…"
              : "Joining the room…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="str-video flex h-full flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-rosa/20 px-4 bg-gradient-to-r from-card to-rosa/10">
        <Icon className="h-4 w-4 text-primary/70" />
        <h2 className="font-semibold font-[family-name:var(--font-heading)]">
          {channel.name}
        </h2>
        <span className="ml-2 text-[10px] uppercase tracking-wider text-green-600 font-semibold">
          Live · {participants.length} {participants.length === 1 ? "member" : "members"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipants((s) => !s)}
            className="h-8"
            aria-label="Toggle participants"
          >
            <Users className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">{participants.length}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeave}
            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <PhoneOff className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Leave</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 p-2">
            <SpeakerLayout participantsBarPosition="bottom" />
          </div>
          <div className="border-t border-rosa/20 p-2 flex items-center justify-center bg-card/50">
            <CallControls onLeave={onLeave} />
          </div>
        </div>
        {showParticipants && (
          <aside className="w-64 shrink-0 border-l border-rosa/20 bg-card overflow-auto">
            <CallParticipantsList onClose={() => setShowParticipants(false)} />
          </aside>
        )}
      </div>
    </div>
  );
}
