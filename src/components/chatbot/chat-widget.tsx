"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateResponse } from "@/lib/chatbot-knowledge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, X, Send, Sparkles, Minus } from "lucide-react";
import Image from "next/image";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

const SUGGESTED = [
  "What trips do you offer?",
  "How do I book a trip?",
  "Tell me about Summer Camp",
  "How do I join the community?",
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "¡Hola amiga! 👋 I'm the AYMS assistant. Ask me anything about our trips, events, community, or how to join. What can I help you with?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay
    const delay = 400 + Math.random() * 800;
    setTimeout(() => {
      const response = generateResponse(msg);
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        role: "bot",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, delay);
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
            className="fixed bottom-6 right-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#E8458B] to-[#D4357A] text-white shadow-[0_0_25px_oklch(0.60_0.24_340/0.3)] hover:shadow-[0_0_35px_oklch(0.60_0.24_340/0.4)] transition-shadow"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500 border-2 border-[#D4357A]" />
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
            className="fixed bottom-6 right-6 z-[70] flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#110810] shadow-[0_0_40px_oklch(0.60_0.24_340/0.15)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#E8458B]/20 to-[#D4357A]/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Image src="/ayms-logo.svg" alt="AYMS" width={28} height={28} className="rounded-full" />
                <div>
                  <p className="text-sm font-bold text-white font-[family-name:var(--font-heading)]">AYMS Assistant</p>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] text-white/40">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10"
                  title="Minimize"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {msg.role === "bot" ? (
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-gradient-to-br from-[#E8458B] to-[#D4357A] text-white text-[10px] font-bold">
                          AI
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-white/10 text-white/60 text-[10px] font-bold">
                          You
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-[#E8458B] to-[#D4357A] text-white rounded-br-md"
                          : "bg-white/5 text-white/80 border border-white/8 rounded-bl-md"
                      }`}
                    >
                      {msg.content.split("\n").map((line, i) => (
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
                          {i < msg.content.split("\n").length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-[#E8458B] to-[#D4357A] text-white text-[10px] font-bold">
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

                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Suggested questions (only show at start) */}
            {messages.length <= 1 && (
              <div className="border-t border-white/5 px-4 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/20 mb-1.5">
                  Quick questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="rounded-full bg-white/5 border border-white/8 px-3 py-1 text-[11px] text-white/50 hover:text-white hover:bg-[#E8458B]/10 hover:border-[#E8458B]/30 transition-colors"
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
                  disabled={isTyping}
                  className="flex-1 bg-white/5 border-white/10 text-white text-sm h-9 placeholder:text-white/25 focus-visible:ring-[#E8458B]/30"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  size="icon"
                  className="h-9 w-9 bg-gradient-to-r from-[#E8458B] to-[#D4357A] text-white border-0 disabled:opacity-30 hover:brightness-110 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1.5 text-center text-[9px] text-white/15">
                Powered by AYMS Knowledge Base
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
