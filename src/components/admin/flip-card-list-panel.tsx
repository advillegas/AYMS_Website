"use client";

/**
 * Generic editor for a bilingual flip-card tile list (Why Us, About values,
 * Hero pillars). Add, delete, reorder, pick an icon, set the flip-side
 * gradient, and edit English + Spanish copy. Persists the whole array to
 * cms_config under `contentKey` via saveSiteContent.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  useFlipCards,
  saveSiteContent,
  NEW_FLIP_CARD,
  type FlipCardItem,
} from "@/lib/use-site-content";
import { ICON_CHOICES, iconByName } from "@/lib/section-icons";

const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-white/40";
const inputCls =
  "bg-white/5 border-white/10 text-white text-xs h-8 focus-visible:ring-[#FF0099]/30";

interface Props {
  contentKey: string;
  defaults: FlipCardItem[];
  title: string;
  itemLabel: string;
  /** About cards expose an icon tint; others don't. */
  showIconColor?: boolean;
}

export function FlipCardListPanel({
  contentKey,
  defaults,
  title,
  itemLabel,
  showIconColor,
}: Props) {
  const live = useFlipCards(contentKey, defaults);
  const confirm = useConfirm();
  const [form, setForm] = useState<FlipCardItem[]>(live);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Adopt live values until the admin starts editing (avoids clobbering edits).
  useEffect(() => {
    if (!dirty) setForm(live);
  }, [live, dirty]);

  function mutate(next: FlipCardItem[]) {
    setForm(next);
    setDirty(true);
  }
  function update(i: number, patch: Partial<FlipCardItem>) {
    mutate(form.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function add() {
    mutate([...form, { ...NEW_FLIP_CARD }]);
  }
  async function remove(i: number) {
    const ok = await confirm({
      title: `Delete this ${itemLabel}?`,
      description: "It will be removed from the page when you save.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    mutate(form.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= form.length) return;
    const next = [...form];
    [next[i], next[j]] = [next[j], next[i]];
    mutate(next);
  }
  async function save() {
    setSaving(true);
    const ok = await saveSiteContent(contentKey, form);
    setSaving(false);
    if (ok) {
      setDirty(false);
      toast.success("Saved! Your tiles are live.");
    } else {
      toast.error("Couldn't save", {
        description: "Check your connection or sign in again, then retry.",
      });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold text-white">
            {title}
          </h2>
          <p className="text-[11px] text-white/40">
            Add, remove, reorder, and restyle each {itemLabel}.
          </p>
        </div>
        <Button
          size="sm"
          onClick={save}
          disabled={saving || !dirty}
          className="gap-1.5 border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110 disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          {form.map((item, i) => {
            const Icon = iconByName(item.icon);
            return (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-white/80">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FF0099]/15 text-[#FF0099]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {itemLabel} {i + 1}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <IconBtn onClick={() => move(i, -1)} disabled={i === 0} title="Move up">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn onClick={() => move(i, 1)} disabled={i === form.length - 1} title="Move down">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn onClick={() => remove(i)} title="Delete" danger>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={labelCls}>Icon</label>
                      <select
                        value={item.icon}
                        onChange={(e) => update(i, { icon: e.target.value })}
                        className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white"
                      >
                        {ICON_CHOICES.map((name) => (
                          <option key={name} value={name} className="bg-[#1A0814]">
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Flip gradient (Tailwind)</label>
                      <Input
                        value={item.gradientBack}
                        onChange={(e) => update(i, { gradientBack: e.target.value })}
                        placeholder="from-[#FF0099] to-[#B51760]"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {showIconColor && (
                    <div className="space-y-1">
                      <label className={labelCls}>Icon color class</label>
                      <Input
                        value={item.iconColor ?? ""}
                        onChange={(e) => update(i, { iconColor: e.target.value })}
                        placeholder="text-primary"
                        className={inputCls}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className={labelCls}>Title (EN)</label>
                      <Input value={item.enTitle} onChange={(e) => update(i, { enTitle: e.target.value })} className={inputCls} />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Title (ES)</label>
                      <Input value={item.esTitle} onChange={(e) => update(i, { esTitle: e.target.value })} className={inputCls} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>Description (EN)</label>
                    <textarea
                      value={item.enDesc}
                      onChange={(e) => update(i, { enDesc: e.target.value })}
                      rows={2}
                      className="w-full resize-none rounded-md border border-white/10 bg-white/5 p-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Description (ES)</label>
                    <textarea
                      value={item.esDesc}
                      onChange={(e) => update(i, { esDesc: e.target.value })}
                      rows={2}
                      className="w-full resize-none rounded-md border border-white/10 bg-white/5 p-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/30"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={add}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 py-3 text-xs font-medium text-white/60 transition-colors hover:border-[#FF0099]/50 hover:text-white"
          >
            <Plus className="h-4 w-4" /> Add {itemLabel}
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={
        "flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-25 " +
        (danger
          ? "text-white/40 hover:bg-red-500/15 hover:text-red-400"
          : "text-white/40 hover:bg-white/10 hover:text-white")
      }
    >
      {children}
    </button>
  );
}
