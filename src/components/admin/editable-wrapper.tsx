"use client";

import { useRef } from "react";
import { useEditMode } from "@/lib/edit-mode";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Settings,
} from "lucide-react";

interface Props {
  elementId: string;
  children: React.ReactNode;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpenProps: () => void;
  isFirst: boolean;
  isLast: boolean;
  label?: string;
}

export function EditableWrapper({
  elementId,
  children,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onOpenProps,
  isFirst,
  isLast,
  label,
}: Props) {
  const isEditMode = useEditMode((s) => s.isEditMode);
  const selectedId = useEditMode((s) => s.selectedElementId);
  const isSelected = selectedId === elementId;

  if (!isEditMode) return <>{children}</>;

  return (
    <div
      className={cn(
        "relative group/editable",
        isSelected && "z-10",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Hover/selected border */}
      <div
        className={cn(
          "absolute -inset-1 rounded-lg pointer-events-none transition-all",
          isSelected
            ? "border-2 border-[#FF0099] shadow-[0_0_15px_rgb(255_0_153/0.15)]"
            : "border border-transparent group-hover/editable:border-[#FF0099]/30 group-hover/editable:border-dashed",
        )}
      />

      {/* Label tag */}
      {label && (
        <div
          className={cn(
            "absolute -top-5 left-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-t transition-opacity pointer-events-none",
            isSelected
              ? "bg-[#FF0099] text-white opacity-100"
              : "bg-[#FF0099]/70 text-white opacity-0 group-hover/editable:opacity-100",
          )}
        >
          {label}
        </div>
      )}

      {/* Floating action buttons — top right */}
      <div
        className={cn(
          "absolute -top-3 -right-1 flex items-center gap-0.5 rounded-lg bg-[#1a0f18] border border-white/15 px-1 py-0.5 shadow-lg shadow-black/40 transition-opacity z-20",
          isSelected ? "opacity-100" : "opacity-0 group-hover/editable:opacity-100",
        )}
      >
        {!isFirst && (
          <ActionBtn onClick={onMoveUp} title="Move up">
            <ChevronUp className="h-3 w-3" />
          </ActionBtn>
        )}
        {!isLast && (
          <ActionBtn onClick={onMoveDown} title="Move down">
            <ChevronDown className="h-3 w-3" />
          </ActionBtn>
        )}
        <ActionBtn onClick={onOpenProps} title="Properties">
          <Settings className="h-3 w-3" />
        </ActionBtn>
        <ActionBtn onClick={onDuplicate} title="Duplicate">
          <Copy className="h-3 w-3" />
        </ActionBtn>
        <ActionBtn onClick={onDelete} title="Delete" danger>
          <Trash2 className="h-3 w-3" />
        </ActionBtn>
      </div>

      {children}
    </div>
  );
}

function ActionBtn({
  onClick,
  title,
  danger,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={title}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded transition-colors",
        danger
          ? "text-white/40 hover:text-red-400 hover:bg-red-500/10"
          : "text-white/40 hover:text-white hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
