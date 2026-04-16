"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import {
  useBuilder,
  type ElementType,
} from "@/lib/builder-store";
import { ElementRenderer } from "@/components/builder/element-renderer";
import { PropertiesPanel } from "@/components/builder/properties-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  Type,
  Heading,
  ImageIcon,
  Video,
  MousePointer,
  Minus,
  ArrowUpDown,
  LayoutGrid,
  CreditCard,
  Save,
  Upload,
  FolderOpen,
  Trash2,
  Plus,
  Eye,
  Home,
  GripVertical,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const ELEMENT_PALETTE: { type: ElementType; icon: React.ElementType; label: string }[] = [
  { type: "heading", icon: Heading, label: "Heading" },
  { type: "text", icon: Type, label: "Text" },
  { type: "image", icon: ImageIcon, label: "Image" },
  { type: "video", icon: Video, label: "Video" },
  { type: "button", icon: MousePointer, label: "Button" },
  { type: "spacer", icon: ArrowUpDown, label: "Spacer" },
  { type: "divider", icon: Minus, label: "Divider" },
  { type: "card", icon: CreditCard, label: "Card" },
];

function SortableElement({ element, isSelected }: { element: { id: string; type: string; props: Record<string, unknown> }; isSelected: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const updateElement = useBuilder((s) => s.updateElement);
  const setSelected = useBuilder((s) => s.setSelected);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as string | number,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/sort">
      <div
        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/sort:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <ElementRenderer
        element={element as any}
        editable
        isSelected={isSelected}
        onUpdate={(props) => updateElement(element.id, props)}
        onClick={() => setSelected(element.id)}
      />
    </div>
  );
}

export default function AdminPage() {
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const router = useRouter();

  const elements = useBuilder((s) => s.elements);
  const selectedId = useBuilder((s) => s.selectedId);
  const templates = useBuilder((s) => s.templates);
  const addElement = useBuilder((s) => s.addElement);
  const moveElement = useBuilder((s) => s.moveElement);
  const setSelected = useBuilder((s) => s.setSelected);
  const clearCanvas = useBuilder((s) => s.clearCanvas);
  const saveTemplate = useBuilder((s) => s.saveTemplate);
  const loadTemplate = useBuilder((s) => s.loadTemplate);
  const deleteTemplate = useBuilder((s) => s.deleteTemplate);
  const publish = useBuilder((s) => s.publish);
  const loadFromStorage = useBuilder((s) => s.loadFromStorage);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.replace("/login");
      return;
    }
    loadFromStorage();
  }, [isAuthenticated, user, router, loadFromStorage]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = elements.findIndex((e) => e.id === active.id);
    const newIndex = elements.findIndex((e) => e.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      moveElement(oldIndex, newIndex);
    }
  }

  function handleSave() {
    if (!templateName.trim()) return;
    saveTemplate(templateName.trim());
    setTemplateName("");
    setSaveDialogOpen(false);
    toast.success("Template saved!");
  }

  function handlePublish() {
    publish();
    toast.success("Featured event published!");
  }

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="flex h-screen bg-[#0d060a] text-white overflow-hidden">
      {/* Left sidebar — element palette + templates */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#110810]">
        <div className="flex h-14 items-center gap-2 px-4 border-b border-white/10">
          <Image src="/ayms-logo.svg" alt="AYMS" width={28} height={28} className="rounded-full" />
          <span className="text-sm font-bold font-[family-name:var(--font-heading)]">Admin Portal</span>
        </div>

        <div className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
            Add Elements
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ELEMENT_PALETTE.map((item) => (
              <button
                key={item.type}
                onClick={() => addElement(item.type)}
                className="flex flex-col items-center gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-2.5 text-white/50 transition-all hover:border-[#E8458B]/30 hover:bg-[#E8458B]/5 hover:text-white"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator className="bg-white/10" />

        <div className="flex-1 overflow-auto p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
            Actions
          </p>
          <div className="space-y-1.5">
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)} className="w-full justify-start text-xs border-white/10 text-white/60 hover:text-white hover:bg-white/5">
              <Save className="h-3.5 w-3.5 mr-2" /> Save Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLoadDialogOpen(true)} className="w-full justify-start text-xs border-white/10 text-white/60 hover:text-white hover:bg-white/5">
              <FolderOpen className="h-3.5 w-3.5 mr-2" /> Load Template
            </Button>
            <Button variant="outline" size="sm" onClick={handlePublish} className="w-full justify-start text-xs border-green-500/20 text-green-400 hover:text-green-300 hover:bg-green-500/5">
              <Upload className="h-3.5 w-3.5 mr-2" /> Publish
            </Button>
            <Button variant="outline" size="sm" onClick={clearCanvas} className="w-full justify-start text-xs border-red-500/15 text-red-400/60 hover:text-red-300 hover:bg-red-500/5">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Clear Canvas
            </Button>
          </div>

          <Separator className="bg-white/10 my-3" />

          <div className="space-y-1.5">
            <Link href="/featured" target="_blank" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors">
              <Eye className="h-3.5 w-3.5" /> Preview Live Page
            </Link>
            <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors">
              <Home className="h-3.5 w-3.5" /> Back to Site
            </Link>
          </div>
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-6 bg-[#110810]">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-[#E8458B]" />
            <span className="text-sm font-semibold">Featured Event Builder</span>
            <Badge className="bg-white/5 text-white/40 border-white/10 text-[10px]">
              {elements.length} element{elements.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <Button
            onClick={handlePublish}
            className="bg-gradient-to-r from-[#E8458B] to-[#D4357A] text-white border-0 text-xs px-4 hover:brightness-110"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Publish
          </Button>
        </div>

        <ScrollArea className="flex-1" onClick={() => setSelected(null)}>
          <div className="mx-auto max-w-3xl py-8 px-6 min-h-full">
            {elements.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-center text-white/20">
                <Plus className="h-12 w-12 mb-3" />
                <p className="text-lg font-medium">Empty Canvas</p>
                <p className="text-sm mt-1">Click elements on the left to start building</p>
                <p className="text-xs mt-4 text-white/10">Drag to reorder · Click to edit · Properties on the right</p>
              </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={elements.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {elements.map((el) => (
                    <SortableElement
                      key={el.id}
                      element={el}
                      isSelected={selectedId === el.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </ScrollArea>
      </div>

      {/* Right sidebar — properties */}
      <aside className="w-64 shrink-0 border-l border-white/10 bg-[#110810]">
        <div className="flex h-14 items-center px-4 border-b border-white/10">
          <span className="text-sm font-semibold text-white/60">Properties</span>
        </div>
        <PropertiesPanel />
      </aside>

      {/* Save template dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..."
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-[#E8458B] to-[#D4357A] text-white border-0">
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load template dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Template</DialogTitle>
          </DialogHeader>
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No saved templates yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.elements.length} elements · saved {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        loadTemplate(t.id);
                        setLoadDialogOpen(false);
                        toast.success(`Loaded "${t.name}"`);
                      }}
                      className="text-xs"
                    >
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTemplate(t.id)}
                      className="text-xs text-red-400 border-red-500/20 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
