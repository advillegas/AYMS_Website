"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { sectionsByGroup } from "@/lib/sections/registry";
import type { ElementType } from "@/lib/builder-store";
import {
  Plus,
  Heading,
  Type,
  ImageIcon,
  MousePointer,
  CreditCard,
  Grid3X3,
  Minus,
  ArrowUpDown,
  Megaphone,
  Sparkles,
  HelpCircle,
  Star,
  DollarSign,
  Timer,
  Video,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sections/blocks already on the page (to flag duplicates, not block them). */
  presentTypes: string[];
  /** Receives any type — a `section.*` type OR a basic block ElementType. */
  onAdd: (type: string) => void;
}

/** Build-your-own blocks: full control over tiles, text, media, colors, effects. */
const BLOCK_ITEMS: { type: ElementType; label: string; description: string; icon: React.ElementType }[] = [
  { type: "card", label: "Tile / Card", description: "A card with title, text, image, colors, gradients & flip/glow effects.", icon: CreditCard },
  { type: "heading", label: "Heading", description: "A big headline with color & alignment.", icon: Heading },
  { type: "text", label: "Text", description: "A paragraph of rich text.", icon: Type },
  { type: "image", label: "Image / GIF", description: "An image or GIF with width & alignment.", icon: ImageIcon },
  { type: "video", label: "Video", description: "Embed a YouTube/Vimeo or upload a clip.", icon: Video },
  { type: "button", label: "Button", description: "A call-to-action button with colors & shimmer.", icon: MousePointer },
  { type: "gallery", label: "Gallery", description: "A grid of images.", icon: Grid3X3 },
  { type: "cta-block", label: "CTA block", description: "A bold call-to-action with two buttons.", icon: Sparkles },
  { type: "banner", label: "Banner", description: "A scrolling marquee strip.", icon: Megaphone },
  { type: "testimonial", label: "Testimonial", description: "A quote card with avatar.", icon: Star },
  { type: "pricing", label: "Pricing", description: "A price card with a feature list.", icon: DollarSign },
  { type: "countdown", label: "Countdown", description: "A live countdown timer.", icon: Timer },
  { type: "faq-item", label: "FAQ item", description: "An expandable question & answer.", icon: HelpCircle },
  { type: "divider", label: "Divider", description: "A horizontal rule.", icon: Minus },
  { type: "spacer", label: "Spacer", description: "Vertical breathing room.", icon: ArrowUpDown },
];

/** Elementor-style "Add" library: pre-designed sections + build-your-own blocks. */
export function AddSectionDialog({ open, onOpenChange, presentTypes, onAdd }: Props) {
  const groups = sectionsByGroup();
  function pick(type: string) {
    onAdd(type);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add to the page</DialogTitle>
          <DialogDescription>
            Drop in a pre-designed section, or build your own with tiles, text,
            media and buttons — then style colors &amp; effects on the right.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {/* Build-your-own blocks first — this is the "full control" toolkit */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#FF0099]">
              Build your own
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BLOCK_ITEMS.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => pick(b.type)}
                  className="group flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-[#FF0099]/50 hover:bg-[#FF0099]/5"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF0099]/10 text-[#FF0099]">
                    <b.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{b.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">{b.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Pre-designed page sections */}
          {groups.map(({ group, sections }) => (
            <div key={group}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {group} sections
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sections.map((s) => {
                  const present = presentTypes.includes(s.type);
                  return (
                    <button
                      key={s.type}
                      type="button"
                      onClick={() => pick(s.type)}
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
                          <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">{s.description}</span>
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
