"use client";

import { useState } from "react";
import { useEditMode } from "@/lib/edit-mode";
import type { ElementType } from "@/lib/builder-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Save,
  Upload,
  X,
  Plus,
  Heading,
  Type,
  ImageIcon,
  Video,
  MousePointer,
  ArrowUpDown,
  Minus,
  CreditCard,
  LayoutTemplate,
  ChevronDown,
  Star,
  Grid3X3,
  Plane,
  CalendarDays,
  DollarSign,
  Timer,
  Columns2,
  Megaphone,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface PaletteItem { type: ElementType; icon: React.ElementType; label: string }
interface PaletteCategory { name: string; items: PaletteItem[] }

const PALETTE: PaletteCategory[] = [
  {
    name: "Content",
    items: [
      { type: "heading", icon: Heading, label: "Heading" },
      { type: "text", icon: Type, label: "Text" },
      { type: "image", icon: ImageIcon, label: "Image" },
      { type: "video", icon: Video, label: "Video" },
      { type: "button", icon: MousePointer, label: "Button" },
      { type: "card", icon: CreditCard, label: "Card" },
      { type: "hero", icon: Star, label: "Hero" },
      { type: "testimonial", icon: Sparkles, label: "Testimonial" },
      { type: "gallery", icon: Grid3X3, label: "Gallery" },
    ],
  },
  {
    name: "Trips & Events",
    items: [
      { type: "trip-card", icon: Plane, label: "Trip Card" },
      { type: "event-card", icon: CalendarDays, label: "Event Card" },
      { type: "pricing", icon: DollarSign, label: "Pricing" },
      { type: "countdown", icon: Timer, label: "Countdown" },
    ],
  },
  {
    name: "Layout",
    items: [
      { type: "section", icon: LayoutTemplate, label: "Section" },
      { type: "columns-2", icon: Columns2, label: "2 Columns" },
      { type: "spacer", icon: ArrowUpDown, label: "Spacer" },
      { type: "divider", icon: Minus, label: "Divider" },
      { type: "banner", icon: Megaphone, label: "Banner" },
    ],
  },
  {
    name: "Interactive",
    items: [
      { type: "faq-item", icon: HelpCircle, label: "FAQ Item" },
      { type: "cta-block", icon: Sparkles, label: "CTA Block" },
    ],
  },
];

interface Props {
  onAddElement: (type: ElementType) => void;
  onSave: () => void;
  onPublish: () => void;
}

export function AdminToolbar({ onAddElement, onSave, onPublish }: Props) {
  const isEditMode = useEditMode((s) => s.isEditMode);
  const pageSlug = useEditMode((s) => s.pageSlug);
  const exitEditMode = useEditMode((s) => s.exitEditMode);
  const [paletteOpen, setPaletteOpen] = useState(false);

  if (!isEditMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-10 bg-[#2A0A1E] border-b border-[#FF0099]/30 flex items-center px-4 gap-3 shadow-lg shadow-black/30">
      {/* Left: status */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
          Edit Mode
        </span>
        {pageSlug && (
          <span className="text-[10px] text-white/30 ml-1">
            / {pageSlug}
          </span>
        )}
      </div>

      {/* Center: add elements dropdown */}
      <div className="flex-1 flex justify-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPaletteOpen(!paletteOpen)}
            aria-expanded={paletteOpen}
            aria-haspopup="menu"
            className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Add Element
            <ChevronDown className={`h-3 w-3 transition-transform ${paletteOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {paletteOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setPaletteOpen(false)} />
              <div
                role="menu"
                aria-label="Add element"
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 rounded-xl bg-[#1a0f18] border border-white/10 p-3 shadow-xl shadow-black/40 w-[340px] max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto space-y-3"
              >
                {PALETTE.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-1.5 px-1">{cat.name}</p>
                    <div className="grid grid-cols-3 gap-1">
                      {cat.items.map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          role="menuitem"
                          aria-label={`Add ${item.label}`}
                          onClick={() => {
                            onAddElement(item.type);
                            setPaletteOpen(false);
                          }}
                          className="flex flex-col items-center gap-1 rounded-lg p-2.5 text-white/50 hover:bg-[#FF0099]/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                        >
                          <item.icon className="h-4 w-4" aria-hidden="true" />
                          <span className="text-[9px] font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => { onSave(); toast.success("Saved!"); }}
          variant="ghost"
          className="h-7 px-2.5 text-[11px] text-white/60 hover:text-white hover:bg-white/10 gap-1"
        >
          <Save className="h-3 w-3" aria-hidden="true" />
          Save
        </Button>
        <Button
          onClick={() => { onPublish(); toast.success("Published!"); }}
          className="h-7 px-2.5 text-[11px] bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 hover:brightness-110 gap-1"
        >
          <Upload className="h-3 w-3" aria-hidden="true" />
          Publish
        </Button>
        <div className="w-px h-4 bg-white/10 mx-1" aria-hidden="true" />
        <Button
          onClick={exitEditMode}
          variant="ghost"
          className="h-7 px-2 text-[11px] text-white/40 hover:text-white hover:bg-white/10"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Exit
        </Button>
      </div>
    </div>
  );
}
