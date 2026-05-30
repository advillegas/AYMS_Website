"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, Minus, AlertCircle } from "lucide-react";
import Image from "next/image";

const SUGGESTED = [
  "What trips do you offer?",
  "How do I book a trip?",
  "Tell me about Summer Camp",
  "How do I join the community?",
];

const WELCOME_MESSAGE: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text:
        "\u00a1Hola amiga! \ud83d\udc4b I'm the AYMS assistant. Ask me anything about our trips, events, community, or how to join. What can I help you with?",
    },
  ],
};

function renderTextWithBold(text: string) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={j}>{part}</span>
        ),
      )}
      {i < text.split("\n").length - 1 && <br />}
    </span>
  ));
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: [WELCOME_MESSAGE],
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isBusy) return;
    sendMessage({ text: msg });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FF0099] to-[#B51760] text-white shadow-[0_0_25px_rgb(255_0_153_/_0.3)] hover:shadow-[0_0_35px_rgb(255_0_153_/_0.4)] transition-shadow"
            aria-label="Open AYMS chat assistant"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500 border-2 border-[#B51760]" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-[70] flex h-[min(620px,calc(100vh-3rem))] w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#2A0A1E] shadow-[0_0_40px_rgb(255_0_153_/_0.15)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#FF0099]/20 to-[#B51760]/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Image src="/ayms-logo.svg" alt="AYMS" width={28} height={28} className="rounded-full" />
                <div>
                  <p className="text-sm font-bold text-white font-[family-name:var(--font-heading)]">
                    AYMS Assistant
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] text-white/40">
                      {isBusy ? "Thinking..." : "Online"}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10"
                title="Minimize"
                aria-label="Minimize chat"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-color:theme(colors.white/0.2)_transparent] [scrollbar-width:thin]"
              role="log"
              aria-label="AYMS assistant conversation"
            >
              <div className="space-y-4">
                {messages.map((msg) => {
                  const text = msg.parts
                    .filter((p) => p.type === "text")
                    .map((p) => (p as { type: "text"; text: string }).text)
                    .join("");
                  if (!text && msg.role !== "assistant") return null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback
                          className={
                            msg.role === "assistant"
                              ? "bg-gradient-to-br from-[#FF0099] to-[#B51760] text-white text-[10px] font-bold"
                              : "bg-white/10 text-white/60 text-[10px] font-bold"
                          }
                        >
                          {msg.role === "assistant" ? "AI" : "You"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white rounded-br-md"
                            : "bg-white/5 text-white/85 border border-white/8 rounded-bl-md"
                        }`}
                      >
                        {text ? (
                          renderTextWithBold(text)
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Submitted but no assistant message yet */}
                {status === "submitted" &&
                  messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-2.5">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-[#FF0099] to-[#B51760] text-white text-[10px] font-bold">
                          AI
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white/5 border border-white/8 px-4 py-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Couldn&apos;t reach the assistant</p>
                      <p className="text-red-200/70 mt-0.5">
                        Please try again, or email us at hello@amigasymassocial.com.
                      </p>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            {/* Suggested questions */}
            {messages.length <= 1 && !isBusy && (
              <div className="border-t border-white/5 px-4 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/20 mb-1.5">
                  Quick questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="rounded-full bg-white/5 border border-white/8 px-3 py-1 text-[11px] text-white/50 hover:text-white hover:bg-[#FF0099]/10 hover:border-[#FF0099]/30 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-white/10 px-3 py-2.5">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  disabled={isBusy}
                  className="flex-1 bg-white/5 border-white/10 text-white text-sm h-9 placeholder:text-white/25 focus-visible:ring-[#FF0099]/30"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isBusy}
                  size="icon"
                  className="h-9 w-9 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 disabled:opacity-30 hover:brightness-110 shrink-0"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1.5 text-center text-[9px] text-white/15">
                Powered by Claude Haiku · Answers reflect AYMS knowledge base
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
