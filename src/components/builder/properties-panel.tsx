"use client";

import { useBuilder, type BuilderElement } from "@/lib/builder-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Copy, X } from "lucide-react";
import { useRef } from "react";

export function PropertiesPanel() {
  const selectedId = useBuilder((s) => s.selectedId);
  const elements = useBuilder((s) => s.elements);
  const updateElement = useBuilder((s) => s.updateElement);
  const removeElement = useBuilder((s) => s.removeElement);
  const duplicateElement = useBuilder((s) => s.duplicateElement);
  const setSelected = useBuilder((s) => s.setSelected);

  const el = elements.find((e) => e.id === selectedId);

  if (!el) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white/30">
        <p className="text-sm">Select an element to edit its properties</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">
            {el.type}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="h-6 w-6 text-white/40 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => duplicateElement(el.id)} className="flex-1 text-xs border-white/10 text-white/60 hover:text-white hover:bg-white/5">
            <Copy className="h-3 w-3 mr-1.5" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={() => removeElement(el.id)} className="flex-1 text-xs border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <Trash2 className="h-3 w-3 mr-1.5" /> Delete
          </Button>
        </div>

        <Separator className="bg-white/10" />

        <PropFields element={el} onUpdate={(props) => updateElement(el.id, props)} />
      </div>
    </ScrollArea>
  );
}

function PropFields({ element, onUpdate }: { element: BuilderElement; onUpdate: (p: Record<string, unknown>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const p = element.props;

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, key: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdate({ [key]: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  const inputCls = "bg-white/5 border-white/10 text-white text-xs h-8 focus-visible:ring-[#E8458B]/30";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-white/40";

  switch (element.type) {
    case "heading":
      return (
        <div className="space-y-3">
          <Field label="Text">
            <Input value={p.text as string} onChange={(e) => onUpdate({ text: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Level">
            <select
              value={p.level as string}
              onChange={(e) => onUpdate({ level: e.target.value })}
              className={`w-full rounded-md px-2 py-1 ${inputCls} bg-white/5 border border-white/10`}
            >
              <option value="h1">H1 — Large</option>
              <option value="h2">H2 — Medium</option>
              <option value="h3">H3 — Small</option>
            </select>
          </Field>
          <Field label="Alignment">
            <AlignPicker value={p.align as string} onChange={(v) => onUpdate({ align: v })} />
          </Field>
          <Field label="Color">
            <ColorPicker value={p.color as string} onChange={(v) => onUpdate({ color: v })} />
          </Field>
        </div>
      );

    case "text":
      return (
        <div className="space-y-3">
          <Field label="Text">
            <textarea
              value={p.text as string}
              onChange={(e) => onUpdate({ text: e.target.value })}
              rows={4}
              className={`w-full rounded-md px-2 py-1.5 resize-none ${inputCls} bg-white/5 border border-white/10`}
            />
          </Field>
          <Field label="Font Size">
            <Input type="number" value={p.fontSize as string} onChange={(e) => onUpdate({ fontSize: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Alignment">
            <AlignPicker value={p.align as string} onChange={(v) => onUpdate({ align: v })} />
          </Field>
          <Field label="Color">
            <ColorPicker value={p.color as string} onChange={(v) => onUpdate({ color: v })} />
          </Field>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <Field label="Image">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "src")} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full text-xs border-white/10 text-white/60 hover:text-white hover:bg-white/5">
              {(p.src as string) ? "Change Image" : "Upload Image"}
            </Button>
            {(p.src as string) && (
              <img src={p.src as string} alt="" className="mt-2 w-full rounded-lg" />
            )}
          </Field>
          <Field label="Or paste URL">
            <Input value={p.src as string} onChange={(e) => onUpdate({ src: e.target.value })} placeholder="https://..." className={inputCls} />
          </Field>
          <Field label="Alt Text">
            <Input value={p.alt as string} onChange={(e) => onUpdate({ alt: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Border Radius">
            <Input type="number" value={p.borderRadius as string} onChange={(e) => onUpdate({ borderRadius: e.target.value })} className={inputCls} />
          </Field>
        </div>
      );

    case "video":
      return (
        <div className="space-y-3">
          <Field label="Video">
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, "src")} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full text-xs border-white/10 text-white/60 hover:text-white hover:bg-white/5">
              {(p.src as string) ? "Change Video" : "Upload Video"}
            </Button>
          </Field>
          <Field label="Or paste URL">
            <Input value={p.src as string} onChange={(e) => onUpdate({ src: e.target.value })} placeholder="https://..." className={inputCls} />
          </Field>
          <Field label="Poster Image URL">
            <Input value={p.poster as string} onChange={(e) => onUpdate({ poster: e.target.value })} className={inputCls} />
          </Field>
        </div>
      );

    case "button":
      return (
        <div className="space-y-3">
          <Field label="Text">
            <Input value={p.text as string} onChange={(e) => onUpdate({ text: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Link URL">
            <Input value={p.href as string} onChange={(e) => onUpdate({ href: e.target.value })} placeholder="https://..." className={inputCls} />
          </Field>
          <Field label="Style">
            <select
              value={p.variant as string}
              onChange={(e) => onUpdate({ variant: e.target.value })}
              className={`w-full rounded-md px-2 py-1 ${inputCls} bg-white/5 border border-white/10`}
            >
              <option value="primary">Primary (Pink)</option>
              <option value="outline">Outline</option>
              <option value="white">White</option>
            </select>
          </Field>
          <Field label="Alignment">
            <AlignPicker value={p.align as string} onChange={(v) => onUpdate({ align: v })} />
          </Field>
        </div>
      );

    case "spacer":
      return (
        <div className="space-y-3">
          <Field label="Height (px)">
            <Input type="number" value={p.height as string} onChange={(e) => onUpdate({ height: e.target.value })} className={inputCls} />
          </Field>
        </div>
      );

    case "divider":
      return (
        <div className="space-y-3">
          <Field label="Color">
            <ColorPicker value={p.color as string} onChange={(v) => onUpdate({ color: v })} />
          </Field>
          <Field label="Opacity">
            <Input type="number" step="0.1" min="0" max="1" value={p.opacity as string} onChange={(e) => onUpdate({ opacity: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Width">
            <Input value={p.width as string} onChange={(e) => onUpdate({ width: e.target.value })} className={inputCls} />
          </Field>
        </div>
      );

    case "card":
      return (
        <div className="space-y-3">
          <Field label="Title">
            <Input value={p.title as string} onChange={(e) => onUpdate({ title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea
              value={p.description as string}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
              className={`w-full rounded-md px-2 py-1.5 resize-none ${inputCls} bg-white/5 border border-white/10`}
            />
          </Field>
          <Field label="Background">
            <ColorPicker value={p.bgColor as string} onChange={(v) => onUpdate({ bgColor: v })} />
          </Field>
          <Field label="Border Color">
            <ColorPicker value={p.borderColor as string} onChange={(v) => onUpdate({ borderColor: v })} />
          </Field>
        </div>
      );

    default:
      return null;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</Label>
      {children}
    </div>
  );
}

function AlignPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {(["left", "center", "right"] as const).map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={`flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
            value === a ? "bg-[#E8458B] text-white" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
          }`}
        >
          {a.charAt(0).toUpperCase() + a.slice(1)}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 rounded border border-white/10 bg-transparent cursor-pointer" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-white/5 border-white/10 text-white text-xs h-8" />
    </div>
  );
}
