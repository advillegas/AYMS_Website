"use client";

import React from "react";
import { useCommunity } from "@/lib/store";
import { useCommunityMembers } from "@/lib/use-community-members";
import { URL_REGEX, LinkPreview } from "./link-preview";
import { ProfileMiniTrigger } from "./profile-mini-card";
import { cn } from "@/lib/utils";

/**
 * Renders the body of a chat message:
 *  - URLs become <a> tags + Open Graph preview cards
 *  - @everyone, @channel get a special highlight pill
 *  - @&lt;member&gt; renders as a clickable chip that opens the profile sidecar
 *  - newlines are preserved
 *
 * Mention matching is permissive: it matches the first word of any
 * member's name (e.g. @maria), the slugified full name (@maria-garcia),
 * or the literal email local-part (@maria). The match is
 * case-insensitive.
 */

const MENTION_RE = /@([a-z0-9_-]+)/gi;

interface MessageContentProps {
  content: string;
  currentUserName?: string;
  className?: string;
}

interface MemberMatch {
  id: string;
  name: string;
  avatar: string;
}

function buildMentionIndex(
  members: { id: string; name: string; avatar: string; email: string }[],
): Map<string, MemberMatch> {
  const map = new Map<string, MemberMatch>();
  for (const m of members) {
    const lower = m.name.toLowerCase();
    const first = lower.split(" ")[0];
    const slug = lower.replace(/\s+/g, "-");
    const emailLocal = m.email?.split("@")[0]?.toLowerCase();
    const target: MemberMatch = { id: m.id, name: m.name, avatar: m.avatar };
    if (first) map.set(first, target);
    map.set(slug, target);
    if (emailLocal) map.set(emailLocal, target);
  }
  return map;
}

interface Segment {
  kind: "text" | "url" | "mention-special" | "mention-user";
  value: string;
  // mention-user only
  member?: MemberMatch;
  // mention-special only
  special?: "everyone" | "channel";
}

/**
 * Tokenize the message into a flat segment list. We walk URLs first
 * (high-precedence), then re-walk the non-url text for mentions.
 */
function tokenize(
  content: string,
  members: Map<string, MemberMatch>,
): Segment[] {
  const segments: Segment[] = [];
  let lastIdx = 0;

  // First pass: pull out URLs.
  const urlMatches: { start: number; end: number; value: string }[] = [];
  for (const m of content.matchAll(URL_REGEX)) {
    if (m.index === undefined) continue;
    urlMatches.push({
      start: m.index,
      end: m.index + m[0].length,
      value: m[0],
    });
  }

  function pushTextWithMentions(text: string) {
    let idx = 0;
    for (const mm of text.matchAll(MENTION_RE)) {
      if (mm.index === undefined) continue;
      if (mm.index > idx) {
        segments.push({ kind: "text", value: text.slice(idx, mm.index) });
      }
      const token = mm[1].toLowerCase();
      if (token === "everyone") {
        segments.push({
          kind: "mention-special",
          value: "@everyone",
          special: "everyone",
        });
      } else if (token === "channel" || token === "here") {
        segments.push({
          kind: "mention-special",
          value: "@channel",
          special: "channel",
        });
      } else {
        const member = members.get(token);
        if (member) {
          segments.push({
            kind: "mention-user",
            value: `@${member.name}`,
            member,
          });
        } else {
          segments.push({ kind: "text", value: mm[0] });
        }
      }
      idx = mm.index + mm[0].length;
    }
    if (idx < text.length) {
      segments.push({ kind: "text", value: text.slice(idx) });
    }
  }

  for (const u of urlMatches) {
    if (u.start > lastIdx) {
      pushTextWithMentions(content.slice(lastIdx, u.start));
    }
    segments.push({ kind: "url", value: u.value });
    lastIdx = u.end;
  }
  if (lastIdx < content.length) {
    pushTextWithMentions(content.slice(lastIdx));
  }

  return segments;
}

export function MessageContent({
  content,
  currentUserName,
  className,
}: MessageContentProps) {
  const mockMembers = useCommunity((s) => s.members);
  const { members: liveMembers } = useCommunityMembers();
  const members = liveMembers.length > 0 ? liveMembers : mockMembers;

  const idx = React.useMemo(() => buildMentionIndex(members), [members]);
  const segments = React.useMemo(() => tokenize(content, idx), [content, idx]);

  const urls: string[] = [];
  for (const s of segments) {
    if (s.kind === "url" && !urls.includes(s.value)) urls.push(s.value);
  }
  // Cap previews to avoid runaway fetches if someone pastes 30 links.
  const previewUrls = urls.slice(0, 3);

  const lowerSelf = currentUserName?.toLowerCase();

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap">
        {segments.map((seg, i) => {
          switch (seg.kind) {
            case "text":
              return <React.Fragment key={i}>{seg.value}</React.Fragment>;
            case "url":
              return (
                <a
                  key={i}
                  href={seg.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {seg.value}
                </a>
              );
            case "mention-special":
              return (
                <span
                  key={i}
                  className="inline-flex items-center rounded px-1 py-0.5 mx-px text-xs font-semibold bg-coral/20 text-coral align-baseline"
                >
                  {seg.value}
                </span>
              );
            case "mention-user": {
              const isMe =
                lowerSelf && seg.member?.name.toLowerCase() === lowerSelf;
              const member = seg.member;
              if (!member) {
                return <React.Fragment key={i}>{seg.value}</React.Fragment>;
              }
              return (
                <ProfileMiniTrigger
                  key={i}
                  userId={member.id}
                  snapshot={{
                    name: member.name,
                    avatar: member.avatar,
                  }}
                  placement="top-start"
                >
                  {({ triggerRef, onClick }) => (
                    <button
                      type="button"
                      ref={triggerRef as React.RefObject<HTMLButtonElement>}
                      onClick={onClick}
                      className={cn(
                        "inline-flex items-center rounded px-1 py-0.5 mx-px text-xs font-semibold align-baseline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isMe
                          ? "bg-primary/30 text-primary ring-1 ring-primary/40 hover:bg-primary/40"
                          : "bg-primary/15 text-primary hover:bg-primary/25",
                      )}
                    >
                      {seg.value}
                    </button>
                  )}
                </ProfileMiniTrigger>
              );
            }
          }
        })}
      </p>
      {previewUrls.map((u) => (
        <LinkPreview key={u} url={u} />
      ))}
    </div>
  );
}
