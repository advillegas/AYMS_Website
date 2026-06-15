"use client";

import { SectionRenderer } from "@/components/builder/section-renderer";
import { getSectionDef } from "@/lib/sections/registry";
import type { BuilderElement } from "@/lib/builder-store";
import type { SectionCommonProps } from "@/lib/sections/types";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Settings2,
  GripVertical,
} from "lucide-react";

interface Props {
  element: BuilderElement;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHide: () => void;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

/**
 * Editor chrome wrapped around a live section on the full-bleed canvas:
 * selection ring, hover toolbar (move / duplicate / hide / delete / settings)
 * and a drag handle. Clicks select the section; inline text/image editing still
 * works because EditableText/EditableImage stop propagation. Anchor navigation
 * and form submits are intercepted so editing never bounces the admin away.
 */
export function SectionFrame({
  element,
  index,
  total,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onToggleHide,
  dragAttributes,
  dragListeners,
}: Props) {
  const def = getSectionDef(element.type);
  const p = element.props as SectionCommonProps;
  const hidden = p.visible === false;
  const label = p._label || def?.label || element.type;
  // Locked sections (page chrome) can't be removed — hide the delete control.
  const canDelete = !def?.locked;

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div
      className={cn(
        "group/sec relative outline-offset-[-2px] transition-[outline-color]",
        selected
          ? "outline outline-2 outline-[#FF0099]"
          : "outline-dashed outline-1 outline-transparent hover:outline-[#FF0099]/40",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      // Block navigation + form submits while editing so the admin stays put.
      onClickCapture={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        if (a) e.preventDefault();
      }}
      onSubmitCapture={(e) => e.preventDefault()}
    >
      {/* Floating section toolbar (top-center, on hover/selection) */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-[#221019]/10 bg-white/95 px-1 py-1 text-[#221019] shadow-lg backdrop-blur transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover/sec:opacity-100",
        )}
      >
        <span
          {...(dragAttributes ?? {})}
          {...(dragListeners ?? {})}
          onClick={stop}
          className="pointer-events-auto flex h-7 cursor-grab items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-[#221019]/70 hover:bg-[#FF0099]/10 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </span>
        <span className="mx-0.5 h-4 w-px bg-[#221019]/10" />
        <IconBtn title="Move up" disabled={index === 0} onClick={(e) => { stop(e); onMoveUp(); }}>
          <ChevronUp className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="Move down" disabled={index >= total - 1} onClick={(e) => { stop(e); onMoveDown(); }}>
          <ChevronDown className="h-4 w-4" />
        </IconBtn>
        <IconBtn title={hidden ? "Show section" : "Hide section"} onClick={(e) => { stop(e); onToggleHide(); }}>
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </IconBtn>
        <IconBtn title="Duplicate" onClick={(e) => { stop(e); onDuplicate(); }}>
          <Copy className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="Settings" onClick={(e) => { stop(e); onSelect(); }}>
          <Settings2 className="h-4 w-4" />
        </IconBtn>
        {canDelete && (
          <IconBtn title="Delete section" danger onClick={(e) => { stop(e); onDelete(); }}>
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        )}
      </div>

      {hidden && (
        <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-full bg-[#221019]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          Hidden from visitors
        </div>
      )}

      <SectionRenderer element={element} editing />
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-30",
        danger
          ? "text-red-500 hover:bg-red-500/10"
          : "text-[#221019]/60 hover:bg-[#FF0099]/10 hover:text-[#FF0099]",
      )}
    >
      {children}
    </button>
  );
}
