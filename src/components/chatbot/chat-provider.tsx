"use client";

import { ChatWidget } from "./chat-widget";
import { usePathname } from "next/navigation";

export function ChatProvider() {
  const pathname = usePathname();
  // Don't show chat on admin builder page
  if (pathname === "/admin") return null;
  return <ChatWidget />;
}
