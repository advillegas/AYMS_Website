"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/lib/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, Send, Users } from "lucide-react";
import { useCommunity } from "@/lib/store";
import { format, isToday, isYesterday } from "date-fns";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatMessageTime(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy h:mm a");
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const messages = useChat((s) => s.messages);
  const channels = useChat((s) => s.channels);
  const activeChannel = useChat((s) => s.activeChannel);
  const sendMessage = useChat((s) => s.sendMessage);
  const onlineMembers = useCommunity((s) => s.onlineMembers);
  const members = useCommunity((s) => s.members);
  const bottomRef = useRef<HTMLDivElement>(null);

  const channel = channels.find((c) => c.id === activeChannel);
  const channelMessages = messages.filter(
    (m) => m.channelId === activeChannel,
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  }

  return (
    <div className="flex h-full">
      {/* Chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Channel header */}
        <div className="flex h-12 items-center gap-2 border-b border-rosa/15 px-4 bg-gradient-to-r from-background to-rosa/3">
          <Hash className="h-4 w-4 text-primary/60" />
          <h2 className="font-semibold font-[family-name:var(--font-heading)]">{channel?.name || "General"}</h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            — {channel?.description}
          </span>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {channelMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Hash className="h-12 w-12 text-primary/20 mb-3" />
                <p className="text-lg font-medium">
                  Welcome to #{channel?.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {channel?.description}
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Be the first to send a message!
                </p>
              </div>
            )}
            {channelMessages.map((msg) => (
              <div key={msg.id} className="group flex gap-3">
                <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary/15 to-rosa/15 text-primary text-xs font-semibold">
                    {initials(msg.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">
                      {msg.userName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Message input */}
        <div className="border-t border-rosa/15 px-4 py-3">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message #${channel?.name || "general"}...`}
              className="flex-1 border-rosa/20 focus-visible:ring-primary/30"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={!input.trim()} className="bg-gradient-to-r from-primary to-magenta text-white border-0 disabled:opacity-40">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Members sidebar (desktop only) */}
      <aside className="hidden w-56 shrink-0 border-l border-rosa/15 bg-rosa/3 xl:block">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary/60" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/50">
              Members
            </span>
          </div>

          <p className="text-[10px] font-semibold uppercase text-green-600 mb-1.5">
            Online — {onlineMembers.length}
          </p>
          {members
            .filter((m) => onlineMembers.includes(m.id))
            .map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm"
              >
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-green-500" />
                </div>
                <span className="truncate text-xs">{m.name}</span>
              </div>
            ))}

          <p className="text-[10px] font-semibold uppercase text-muted-foreground mt-3 mb-1.5">
            Offline — {members.length - onlineMembers.length}
          </p>
          {members
            .filter((m) => !onlineMembers.includes(m.id))
            .map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm opacity-50"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                    {initials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs">{m.name}</span>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );
}
