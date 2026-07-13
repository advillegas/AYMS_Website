"use client";

/**
 * Admin-editable fact chips for the camp hero (location, dates, audience…),
 * stored under cms_config key "camp.facts". Renders the public chip row and,
 * in edit mode, an "Edit facts" chip opening a full CRUD dialog
 * (add / remove / reorder / relabel / re-icon) — same pattern as
 * CampCtaButtons.
 */

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useInlineEdit } from "@/lib/use-inline-edit";
import {
  useCampFacts,
  saveSiteContent,
  CAMP_FACTS_KEY,
  type CampFactItem,
} from "@/lib/use-site-content";
import { iconByName, ICON_CHOICES } from "@/lib/section-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CampFacts({ className = "" }: { className?: string }) {
  const { items } = useCampFacts();
  const editing = useInlineEdit((s) => s.enabled);
  const [editorOpen, setEditorOpen] = useState(false);

  const visible = items.filter((f) => f.label.trim());

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-3 ${className}`}
    >
      {visible.map((f) => {
        const Icon = iconByName(f.icon);
        return (
          <span
            key={f.id}
            className="flex items-center gap-2 text-sm font-medium text-ink-soft"
          >
            <Icon className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
            {f.label}
          </span>
        );
      })}

      {editing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditorOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-dashed border-[var(--magenta)]/60 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[var(--magenta)] shadow-sm transition-colors hover:bg-[var(--magenta)]/5"
          title="Edit these facts (text, icon, add, remove, reorder)"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit facts
        </button>
      )}

      {editing && (
        <FactsEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          items={items}
        />
      )}
    </div>
  );
}

/* --------------------------- facts editor --------------------------- */

function newFact(): CampFactItem {
  return {
    id: `fact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    icon: "Star",
    label: "New fact",
  };
}

function FactsEditorDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: CampFactItem[];
}) {
  const [draft, setDraft] = useState<CampFactItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [iconPickerFor, setIconPickerFor] = useState<number | null>(null);

  // Re-seed the draft each time the dialog opens (not on live updates
  // mid-edit, which would clobber typing).
  useEffect(() => {
    if (open) {
      setDraft(items.map((f) => ({ ...f })));
      setIconPickerFor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function patch(i: number, p: Partial<CampFactItem>) {
    setDraft((d) => d.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
  }
  function move(i: number, dir: -1 | 1) {
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
    setIconPickerFor(null);
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveSiteContent(CAMP_FACTS_KEY, {
      items: draft.map((f) => ({ ...f, label: f.label.trim() })),
    });
    setSaving(false);
    if (ok) {
      toast.success("Facts saved — live for everyone.");
      onOpenChange(false);
    } else {
      toast.error("Couldn't save. Check your connection and try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Camp hero facts</DialogTitle>
          <DialogDescription>
            The little icon chips under the camp headline (location, dates,
            who it&apos;s for…). Add, remove, reorder, or change each icon.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto py-1 pr-1">
          {draft.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No facts — the row will be empty. Add one below.
            </p>
          )}
          {draft.map((f, i) => {
            const Icon = iconByName(f.icon);
            return (
              <div
                key={f.id}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setIconPickerFor(iconPickerFor === i ? null : i)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors hover:border-[var(--magenta)]/50 hover:bg-[var(--magenta)]/5"
                    title="Change icon"
                    aria-label="Change icon"
                  >
                    <Icon className="h-4 w-4 text-[#FF7F50]" />
                  </button>
                  <div className="grid flex-1 gap-1">
                    <Label className="sr-only">Fact {i + 1} text</Label>
                    <Input
                      value={f.label}
                      onChange={(e) => patch(i, { label: e.target.value })}
                      placeholder="e.g. August 28–30, 2026"
                    />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => move(i, 1)}
                      disabled={i === draft.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => remove(i)}
                      aria-label="Remove fact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {iconPickerFor === i && (
                  <div className="flex flex-wrap gap-1 rounded-md border border-border bg-muted/40 p-2">
                    {ICON_CHOICES.map((name) => {
                      const Choice = iconByName(name);
                      const selected = f.icon === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            patch(i, { icon: name });
                            setIconPickerFor(null);
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                            selected
                              ? "bg-[var(--magenta)]/15 ring-1 ring-[var(--magenta)]/50"
                              : "hover:bg-[var(--magenta)]/10"
                          }`}
                          title={name}
                          aria-label={`Use ${name} icon`}
                        >
                          <Choice className="h-4 w-4 text-[#FF7F50]" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setDraft((d) => [...d, newFact()])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add fact
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110"
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Save facts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
