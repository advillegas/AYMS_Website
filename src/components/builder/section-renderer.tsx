"use client";

import { getSectionDef } from "@/lib/sections/registry";
import type { BuilderElement } from "@/lib/builder-store";
import type { SectionCommonProps } from "@/lib/sections/types";

/**
 * Renders one section block by resolving its type through the section registry
 * and mounting the real marketing component. Applies the common section props
 * (visibility, background, extra padding). Used identically by the published
 * view, the visitor preview, and the edit canvas (with `editing`).
 */
export function SectionRenderer({
  element,
  editing = false,
}: {
  element: BuilderElement;
  editing?: boolean;
}) {
  const def = getSectionDef(element.type);
  const p = element.props as SectionCommonProps & Record<string, unknown>;

  if (!def) {
    if (!editing) return null;
    return (
      <div className="mx-auto my-4 max-w-md rounded-lg border border-dashed border-[#FF0099]/40 bg-white/60 p-4 text-center text-sm text-[#221019]/60">
        Unknown section: <code>{element.type}</code>
      </div>
    );
  }

  // Hidden sections vanish for visitors; in the editor they show dimmed.
  if (p.visible === false && !editing) return null;

  const style: React.CSSProperties = {};
  if (typeof p.bg === "string" && p.bg) style.background = p.bg;
  if (p.padTop) style.paddingTop = `${p.padTop}px`;
  if (p.padBottom) style.paddingBottom = `${p.padBottom}px`;

  const Comp = def.Component;
  const dimmed = editing && p.visible === false;

  return (
    <div style={style} className={dimmed ? "relative opacity-40" : "relative"}>
      <Comp props={element.props} editing={editing} />
    </div>
  );
}
