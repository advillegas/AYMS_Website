"use client";

import Link from "next/link";
import { useBuilder } from "@/lib/builder-store";
import { useEditMode } from "@/lib/edit-mode";
import { getSectionDef } from "@/lib/sections/registry";
import type { SectionField } from "@/lib/sections/types";
import { Input } from "@/components/ui/input";
import { X, Eye, EyeOff, SlidersHorizontal, MousePointerClick } from "lucide-react";

const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-white/40";
const inputCls =
  "bg-white/5 border-white/10 text-white text-xs h-8 focus-visible:ring-[#FF0099]/30";

/**
 * Properties panel for the selected section. Schema-driven: common controls
 * (rename, show/hide, background, spacing) plus any extra `fields` the section
 * declares. Fine-grained text/photos are edited by clicking them on the page.
 */
export function SectionPropsPanel() {
  const selectedId = useEditMode((s) => s.selectedElementId);
  const setSelected = useEditMode((s) => s.setSelectedElement);
  const element = useBuilder((s) => s.elements.find((e) => e.id === selectedId));

  if (!element) return null;
  const def = getSectionDef(element.type);
  const p = element.props as Record<string, unknown>;

  function update(props: Record<string, unknown>) {
    useBuilder.setState((s) => ({
      elements: s.elements.map((e) =>
        e.id === selectedId ? { ...e, props: { ...e.props, ...props } } : e,
      ),
    }));
  }

  const hidden = p.visible === false;

  return (
    <aside className="fixed right-0 top-10 z-[60] flex h-[calc(100vh-2.5rem)] w-72 flex-col border-l border-white/10 bg-[#1A0814] text-white shadow-2xl">
      <div className="flex h-10 items-center justify-between border-b border-white/10 px-3">
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-white/50">
          {(p._label as string) || def?.label || "Section"}
        </span>
        <button
          type="button"
          onClick={() => setSelected(null)}
          aria-label="Close"
          className="rounded text-white/30 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
        {def?.description && (
          <p className="rounded-lg bg-white/5 p-2.5 text-[11px] leading-snug text-white/50">
            {def.description}
          </p>
        )}

        {/* Click-to-edit hint */}
        <div className="flex items-start gap-2 rounded-lg border border-[#FF0099]/20 bg-[#FF0099]/5 p-2.5 text-[11px] leading-snug text-white/70">
          <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF0099]" />
          Click any text or photo on the page to edit it directly.
        </div>

        {/* Manage list content */}
        {def?.manageHref && (
          <Link
            href={def.manageHref}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#FF0099] to-[#B51760] px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {def.manageLabel || "Manage content"}
          </Link>
        )}

        {/* Rename */}
        <Field label="Section name">
          <Input
            value={(p._label as string) ?? ""}
            placeholder={def?.label ?? element.type}
            onChange={(e) => update({ _label: e.target.value })}
            className={inputCls}
          />
        </Field>

        {/* Visibility */}
        <button
          type="button"
          onClick={() => update({ visible: hidden })}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
        >
          <span className="flex items-center gap-2">
            {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {hidden ? "Hidden from visitors" : "Visible to visitors"}
          </span>
          <span className={hidden ? "text-white/40" : "text-green-400"}>
            {hidden ? "Show" : "On"}
          </span>
        </button>

        {/* Background override */}
        <Field label="Background (color or CSS gradient)">
          <Input
            value={(p.bg as string) ?? ""}
            placeholder="e.g. #FFF7FB or linear-gradient(...)"
            onChange={(e) => update({ bg: e.target.value })}
            className={inputCls}
          />
        </Field>

        {/* Extra spacing */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pad top (px)">
            <Input
              type="number"
              value={(p.padTop as string) ?? ""}
              onChange={(e) => update({ padTop: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Pad bottom (px)">
            <Input
              type="number"
              value={(p.padBottom as string) ?? ""}
              onChange={(e) => update({ padBottom: e.target.value })}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Section-specific declared fields */}
        {def?.fields?.map((f) => (
          <DeclaredField key={f.key} field={f} value={p[f.key]} onChange={(v) => update({ [f.key]: v })} />
        ))}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function DeclaredField({
  field,
  value,
  onChange,
}: {
  field: SectionField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "toggle") {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
      >
        {field.label}
        <span className={value ? "text-green-400" : "text-white/40"}>{value ? "On" : "Off"}</span>
      </button>
    );
  }
  if (field.type === "textarea") {
    return (
      <Field label={field.label}>
        <textarea
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-white/10 bg-white/5 p-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/30"
        />
      </Field>
    );
  }
  if (field.type === "select") {
    return (
      <Field label={field.label}>
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white"
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#1A0814]">
              {o.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "color") {
    return (
      <Field label={field.label}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(value as string) || "#FF0099"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
            aria-label={field.label}
          />
          <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
        </div>
      </Field>
    );
  }
  return (
    <Field label={field.label}>
      <Input
        type={field.type === "number" ? "number" : "text"}
        value={(value as string) ?? ""}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
      {field.help && <p className="text-[10px] text-white/35">{field.help}</p>}
    </Field>
  );
}
