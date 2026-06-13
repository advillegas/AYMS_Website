"use client";

import { useEffect, useCallback } from "react";
import { useCms, isSystemSlug } from "@/lib/cms-store";
import { useEditMode } from "@/lib/edit-mode";
import { useAuth } from "@/lib/store";
import { useHasPermission } from "@/lib/use-roles-store";
import { useBuilder, type ElementType, type BuilderElement, getDefaultPropsForType } from "@/lib/builder-store";
import { ElementRenderer } from "@/components/builder/element-renderer";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { EditableWrapper } from "@/components/admin/editable-wrapper";
import { InlinePropsPanel } from "@/components/admin/inline-props-panel";
import { EditPageOverlay } from "@/components/admin/edit-overlay";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { v4 as uuid } from "uuid";
import { PAGE_SNAPSHOTS } from "@/lib/page-snapshots";
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
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface Props {
  slug: string;
  children: React.ReactNode;
}

/**
 * Drag-to-reorder wrapper for a single builder section in edit mode.
 * The grip handle (left gutter) carries the dnd-kit listeners; the rest of
 * the row stays fully interactive (inline edit, select, toolbar buttons).
 */
function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="group/sort relative">
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder section"
        title="Drag to reorder"
        className="absolute -left-9 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 cursor-grab items-center justify-center rounded-lg border border-[#221019]/12 bg-white/80 text-[#221019]/40 opacity-0 shadow-sm backdrop-blur transition-opacity hover:text-[#FF0099] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] active:cursor-grabbing group-hover/sort:opacity-100 sm:flex"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {children}
    </div>
  );
}

export function CmsPageWrapper({ slug, children }: Props) {
  const hasPublished = useCms((s) => s.hasPublishedPage(slug));
  const page = useCms((s) => s.pages[slug]);
  const setPageElements = useCms((s) => s.setPageElements);
  const publishPage = useCms((s) => s.publishPage);
  const user = useAuth((s) => s.user);
  const canEditContent = useHasPermission("manageContent");
  const isAdmin = canEditContent || user?.role === "admin";

  const isEditMode = useEditMode((s) => s.isEditMode);
  const pageSlug = useEditMode((s) => s.pageSlug);
  const selectedElementId = useEditMode((s) => s.selectedElementId);
  const setSelectedElement = useEditMode((s) => s.setSelectedElement);

  const elements = useBuilder((s) => s.elements);

  const isEditing = isEditMode && pageSlug === slug;

  // Hydrate CMS content from Firestore in realtime so an admin's published
  // edits are shared across all visitors (not just the editing browser).
  // Falls back to localStorage when Firebase isn't configured; subscribe()
  // returns its own unsubscribe fn for cleanup.
  useEffect(() => {
    const unsubscribe = useCms.getState().subscribe();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isEditing) {
      const pg = useCms.getState().pages[slug];
      if (pg && pg.elements.length > 0) {
        useBuilder.setState({ elements: JSON.parse(JSON.stringify(pg.elements)), selectedId: null });
      } else {
        const snapFn = PAGE_SNAPSHOTS[slug];
        const seed = snapFn ? snapFn() : [
          { id: uuid(), type: "heading" as const, props: getDefaultPropsForType("heading") },
          { id: uuid(), type: "text" as const, props: getDefaultPropsForType("text") },
        ];
        useBuilder.setState({ elements: seed, selectedId: null });
      }
    }
  }, [isEditing, slug]);

  const handleAddElement = useCallback((type: ElementType) => {
    const el: BuilderElement = { id: uuid(), type, props: getDefaultPropsForType(type) };
    useBuilder.setState((s) => ({
      elements: [...s.elements, el],
      selectedId: el.id,
    }));
    useEditMode.setState({ selectedElementId: el.id });
  }, []);

  const handleSave = useCallback(() => {
    setPageElements(slug, useBuilder.getState().elements);
  }, [slug, setPageElements]);

  const handlePublish = useCallback(() => {
    setPageElements(slug, useBuilder.getState().elements);
    publishPage(slug);
  }, [slug, setPageElements, publishPage]);

  // Reload the built-in coded design into the editor canvas (self-recovery).
  const handleReset = useCallback(() => {
    const snapFn = PAGE_SNAPSHOTS[slug];
    useBuilder.setState({
      elements: snapFn ? snapFn() : [],
      selectedId: null,
    });
    useEditMode.setState({ selectedElementId: null });
  }, [slug]);

  // Hide this page's override so the original coded page goes live again.
  const handleUnpublish = useCallback(() => {
    useCms.getState().unpublishPage(slug);
  }, [slug]);

  const handleListVersions = useCallback(
    () => useCms.getState().listVersions(slug),
    [slug],
  );

  const handleRestoreVersion = useCallback(
    (els: BuilderElement[]) => {
      useBuilder.setState({
        elements: JSON.parse(JSON.stringify(els)),
        selectedId: null,
      });
      useCms.getState().restoreVersion(slug, els);
    },
    [slug],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedElement(id);
    useBuilder.setState({ selectedId: id });
  }, [setSelectedElement]);

  const handleDelete = useCallback((id: string) => {
    useBuilder.setState((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    useEditMode.setState({ selectedElementId: null });
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    useBuilder.setState((s) => {
      const idx = s.elements.findIndex((e) => e.id === id);
      if (idx === -1) return s;
      const dup: BuilderElement = { ...s.elements[idx], id: uuid(), props: { ...s.elements[idx].props } };
      const els = [...s.elements];
      els.splice(idx + 1, 0, dup);
      return { elements: els, selectedId: dup.id };
    });
  }, []);

  const handleMoveUp = useCallback((id: string) => {
    useBuilder.setState((s) => {
      const idx = s.elements.findIndex((e) => e.id === id);
      if (idx <= 0) return s;
      const els = [...s.elements];
      [els[idx - 1], els[idx]] = [els[idx], els[idx - 1]];
      return { elements: els };
    });
  }, []);

  const handleMoveDown = useCallback((id: string) => {
    useBuilder.setState((s) => {
      const idx = s.elements.findIndex((e) => e.id === id);
      if (idx === -1 || idx >= s.elements.length - 1) return s;
      const els = [...s.elements];
      [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
      return { elements: els };
    });
  }, []);

  const handleUpdate = useCallback((id: string, props: Record<string, unknown>) => {
    useBuilder.setState((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, props: { ...e.props, ...props } } : e)),
    }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Reorder sections by drag. Mutates the live builder canvas; the admin
  // still Saves/Publishes to persist, same as button-based reordering.
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    useBuilder.setState((s) => {
      const oldIndex = s.elements.findIndex((e) => e.id === active.id);
      const newIndex = s.elements.findIndex((e) => e.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return s;
      return { elements: arrayMove(s.elements, oldIndex, newIndex) };
    });
  }, []);

  // Published CMS override (NOT editing)
  if (hasPublished && page && !isEditing) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-[88px]">
          <section className="grain relative bg-[#FDFCF7]">
            <div className="absolute inset-0 pattern-dots opacity-[0.04]" aria-hidden="true" />
            <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="space-y-6">
                {page.elements.map((el) => (
                  <ElementRenderer key={el.id} element={el} />
                ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
        {isAdmin && <EditPageOverlay slug={slug} />}
      </>
    );
  }

  // EDIT MODE ACTIVE — show editable canvas ON TOP of the live site
  if (isEditing) {
    return (
      <>
        <AdminToolbar
          onAddElement={handleAddElement}
          onSave={handleSave}
          onPublish={handlePublish}
          slug={slug}
          isSystem={isSystemSlug(slug)}
          onReset={handleReset}
          onUnpublish={handleUnpublish}
          onListVersions={handleListVersions}
          onRestoreVersion={handleRestoreVersion}
        />

        <div className="pt-10" onClick={() => setSelectedElement(null)}>
          <Navbar />
          <main className="min-h-screen pt-[88px]">
            <div className="grain relative min-h-[60vh] bg-[#FDFCF7]">
              <div className="absolute inset-0 pattern-dots opacity-[0.04]" aria-hidden="true" />
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={elements.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <div className="relative mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6 lg:px-8">
                    {elements.map((el, i) => (
                      <SortableSection key={el.id} id={el.id}>
                        <EditableWrapper
                          elementId={el.id}
                          onSelect={() => handleSelect(el.id)}
                          onDelete={() => handleDelete(el.id)}
                          onDuplicate={() => handleDuplicate(el.id)}
                          onMoveUp={() => handleMoveUp(el.id)}
                          onMoveDown={() => handleMoveDown(el.id)}
                          onOpenProps={() => handleSelect(el.id)}
                          isFirst={i === 0}
                          isLast={i === elements.length - 1}
                          label={el.type}
                        >
                          <ElementRenderer
                            element={el}
                            editable
                            isSelected={selectedElementId === el.id}
                            onUpdate={(props) => handleUpdate(el.id, props)}
                            onClick={() => handleSelect(el.id)}
                          />
                        </EditableWrapper>
                      </SortableSection>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </main>
          <Footer />
        </div>

        <InlinePropsPanel />
      </>
    );
  }

  // Normal view (not editing, no CMS override)
  return (
    <>
      {children}
      {isAdmin && <EditPageOverlay slug={slug} />}
    </>
  );
}
