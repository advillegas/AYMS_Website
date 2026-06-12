"use client";

import { useState } from "react";
import { useCms, type NavLink } from "@/lib/cms-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

function SortableNavItem({ link }: { link: NavLink }) {
  const updateNavLink = useCms((s) => s.updateNavLink);
  const removeNavLink = useCms((s) => s.removeNavLink);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2 py-2">
      <div
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${link.label || "link"}`}
        title="Drag to reorder"
        className="cursor-grab text-white/20 hover:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] rounded"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </div>
      <Input
        value={link.label}
        onChange={(e) => updateNavLink(link.id, { label: e.target.value })}
        aria-label="Link label"
        placeholder="Label"
        className="flex-1 bg-transparent border-0 text-white text-xs h-7 p-0 focus-visible:ring-0"
      />
      <Input
        value={link.href}
        onChange={(e) => updateNavLink(link.id, { href: e.target.value })}
        aria-label="Link URL"
        placeholder="URL"
        className="w-24 bg-transparent border-0 text-white/40 text-[10px] h-7 p-0 focus-visible:ring-0"
      />
      <button
        type="button"
        onClick={() => updateNavLink(link.id, { isVisible: !link.isVisible })}
        className={`shrink-0 p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] ${link.isVisible ? "text-green-400 hover:text-green-300" : "text-white/20 hover:text-white/40"}`}
        title={link.isVisible ? `Hide ${link.label || "link"} in nav` : `Show ${link.label || "link"} in nav`}
        aria-label={link.isVisible ? `Hide ${link.label || "link"} in navigation` : `Show ${link.label || "link"} in navigation`}
        aria-pressed={link.isVisible}
      >
        {link.isVisible ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={() => removeNavLink(link.id)}
        title={`Remove ${link.label || "link"}`}
        aria-label={`Remove ${link.label || "link"} from navigation`}
        className="shrink-0 p-1 rounded text-white/20 hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function NavEditor() {
  const navLinks = useCms((s) => s.navLinks);
  const moveNavLink = useCms((s) => s.moveNavLink);
  const addNavLink = useCms((s) => s.addNavLink);
  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = navLinks.findIndex((l) => l.id === active.id);
    const newIndex = navLinks.findIndex((l) => l.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) moveNavLink(oldIndex, newIndex);
  }

  function handleAdd() {
    if (!newLabel.trim() || !newHref.trim()) return;
    addNavLink(newLabel.trim(), newHref.trim());
    setNewLabel("");
    setNewHref("");
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold text-white">Navigation</h2>
        <p className="text-[10px] text-white/30 mt-1">Drag to reorder. Toggle visibility. Edit labels and URLs inline.</p>
      </div>

      <ScrollArea className="flex-1 p-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={navLinks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {navLinks.map((link) => (
                <SortableNavItem key={link.id} link={link} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Separator className="bg-white/10 my-4" />

        <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
          Add Link
        </p>
        <div className="space-y-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Blog)"
            aria-label="New link label"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="bg-white/5 border-white/10 text-white text-xs h-8"
          />
          <Input
            value={newHref}
            onChange={(e) => setNewHref(e.target.value)}
            placeholder="URL (e.g. /p/blog)"
            aria-label="New link URL"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="bg-white/5 border-white/10 text-white text-xs h-8"
          />
          <Button
            onClick={handleAdd}
            disabled={!newLabel.trim() || !newHref.trim()}
            variant="outline"
            size="sm"
            className="w-full text-xs border-white/10 text-white/60 hover:text-white hover:bg-white/5"
          >
            <Plus className="h-3 w-3 mr-1.5" aria-hidden="true" /> Add to Navigation
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
