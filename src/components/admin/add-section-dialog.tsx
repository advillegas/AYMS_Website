"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { sectionsByGroup } from "@/lib/sections/registry";
import type { SectionType } from "@/lib/builder-store";
import { Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sections already on the page (to flag duplicates, not block them). */
  presentTypes: string[];
  onAdd: (type: SectionType) => void;
}

/** Elementor-style "Add section" library, grouped by page. */
export function AddSectionDialog({ open, onOpenChange, presentTypes, onAdd }: Props) {
  const groups = sectionsByGroup();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a section</DialogTitle>
          <DialogDescription>
            Pick a pre-designed section to drop onto the page. You can reorder,
            restyle and hide it afterwards.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {groups.map(({ group, sections }) => (
            <div key={group}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sections.map((s) => {
                  const present = presentTypes.includes(s.type);
                  return (
                    <button
                      key={s.type}
                      type="button"
                      onClick={() => {
                        onAdd(s.type);
                        onOpenChange(false);
                      }}
                      className="group flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-[#FF0099]/50 hover:bg-[#FF0099]/5"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF0099]/10 text-[#FF0099]">
                        <Plus className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {s.label}
                          {present && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                              on page
                            </span>
                          )}
                        </span>
                        {s.description && (
                          <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                            {s.description}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
