"use client";

import { useBuilder } from "@/lib/builder-store";
import { useEditMode } from "@/lib/edit-mode";
import { getSectionDef } from "@/lib/sections/registry";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Eye, EyeOff, GripVertical } from "lucide-react";

interface Props {
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleHide: (id: string) => void;
}

/**
 * Structure / outline tree of the page's sections (left rail). Click to select
 * and scroll to a section; quick reorder + show/hide without scrolling the page.
 */
export function SectionOutline({ onSelect, onMoveUp, onMoveDown, onToggleHide }: Props) {
  const elements = useBuilder((s) => s.elements);
  const selectedId = useEditMode((s) => s.selectedElementId);

  return (
    <div className="flex h-full flex-col">
      <p className="border-b border-white/10 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
        Page structure
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {elements.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-white/30">
            No sections yet. Use “Add section”.
          </p>
        )}
        <ul className="space-y-0.5">
          {elements.map((el, i) => {
            const def = getSectionDef(el.type);
            const hidden = (el.props as { visible?: boolean }).visible === false;
            const label = (el.props as { _label?: string })._label || def?.label || el.type;
            return (
              <li key={el.id}>
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors",
                    selectedId === el.id ? "bg-[#FF0099]/15 text-white" : "text-white/60 hover:bg-white/5",
                  )}
                >
                  <GripVertical className="h-3 w-3 shrink-0 text-white/20" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => onSelect(el.id)}
                    className={cn("min-w-0 flex-1 truncate text-left", hidden && "line-through opacity-50")}
                    title={label}
                  >
                    {label}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleHide(el.id)}
                    className="shrink-0 rounded p-0.5 text-white/30 opacity-0 hover:text-white group-hover:opacity-100"
                    title={hidden ? "Show" : "Hide"}
                  >
                    {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveUp(el.id)}
                    disabled={i === 0}
                    className="shrink-0 rounded p-0.5 text-white/30 opacity-0 hover:text-white disabled:opacity-10 group-hover:opacity-100"
                    title="Move up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDown(el.id)}
                    disabled={i === elements.length - 1}
                    className="shrink-0 rounded p-0.5 text-white/30 opacity-0 hover:text-white disabled:opacity-10 group-hover:opacity-100"
                    title="Move down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
