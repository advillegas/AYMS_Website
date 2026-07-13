"use client";

import { useMemo } from "react";
import { isRichText, sanitizeRichText } from "@/lib/rich-text";

interface RichTextStaticProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  /** Stored value — legacy plain string OR whitelisted inline HTML. */
  value: string;
}

/**
 * Renders a stored text value with rich formatting when present. Plain legacy
 * strings render as ordinary React text (exactly as before); values containing
 * whitelisted tags render as sanitized inline HTML — identical output on the
 * server and client, for admins and visitors alike.
 */
export function RichTextStatic({ as = "span", value, ...rest }: RichTextStaticProps) {
  const Tag = as as React.ElementType;
  const html = useMemo(() => (isRichText(value) ? sanitizeRichText(value) : null), [value]);
  if (html !== null) {
    return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <Tag {...rest}>{value}</Tag>;
}
