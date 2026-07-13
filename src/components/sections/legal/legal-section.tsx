"use client";

import { EditableText } from "@/components/inline/editable-text";

/**
 * Shared shell for legal-page sections (privacy/terms). The heading is
 * click-to-edit; body content is provided by the caller (also wrapped in
 * EditableText piece by piece).
 */
export function LegalSection({
  id,
  titleId,
  title,
  children,
}: {
  id: string;
  /** Override id for the editable heading (e.g. "privacy.cookies.title"). */
  titleId: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-3">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink">
        <EditableText as="span" id={titleId}>{title}</EditableText>
      </h2>
      <div className="space-y-3 text-ink-soft leading-relaxed">{children}</div>
    </section>
  );
}
