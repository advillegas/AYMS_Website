"use client";

import { ChatWidget } from "./chat-widget";
import { usePathname } from "next/navigation";

/**
 * Routes where the floating "AYMS Assistant" bubble is suppressed.
 *
 * - `/admin`: the page builder needs the bottom-right corner for its
 *   own controls.
 * - `/community/*`: members are already inside the product. The
 *   assistant is meant for marketing visitors deciding whether to
 *   join, and the bubble was sitting on top of the DM composer's
 *   emoji + GIF buttons (covering essential affordances). The
 *   in-product members already have the community chat itself for
 *   support questions.
 */
const HIDDEN_PREFIXES = ["/admin", "/community"] as const;

export function ChatProvider() {
  const pathname = usePathname();
  for (const prefix of HIDDEN_PREFIXES) {
    if (pathname === prefix || pathname?.startsWith(`${prefix}/`)) return null;
  }
  return <ChatWidget />;
}
