"use client";

import { useEffect, useCallback, useState } from "react";
import { useCms, isSystemSlug } from "@/lib/cms-store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useEditMode } from "@/lib/edit-mode";
import { useInlineEdit } from "@/lib/use-inline-edit";
import {
  useBuilder,
  type ElementType,
  type BuilderElement,
  getDefaultPropsForType,
  isSectionType,
} from "@/lib/builder-store";
import { ElementRenderer } from "@/components/builder/element-renderer";
import { SectionRenderer } from "@/components/builder/section-renderer";
import { SectionFrame } from "@/components/admin/section-frame";
import { SectionToolbar } from "@/components/admin/section-toolbar";
import { BuilderCoach } from "@/components/admin/builder-coach";
import { SectionPropsPanel } from "@/components/admin/section-props-panel";
import { SectionOutline } from "@/components/admin/section-outline";
import { AddSectionDialog } from "@/components/admin/add-section-dialog";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { EditableWrapper } from "@/components/admin/editable-wrapper";
import { InlinePropsPanel } from "@/components/admin/inline-props-panel";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { v4 as uuid } from "uuid";
import { PAGE_SNAPSHOTS } from "@/lib/page-snapshots";
import { pageHasSections, isSectionList } from "@/lib/sections/registry";
import { seedSectionsForPage } from "@/lib/sections/seed";
import { getSectionDef } from "@/lib/sections/registry";
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

/** Drag wrapper for the GENERIC block builder (custom /p pages). */
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

/** Drag wrapper for the SECTION builder — passes drag handles into the frame. */
function SortableSectionFrame({
  element,
  index,
  total,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onToggleHide,
}: {
  element: BuilderElement;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHide: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} data-section-id={element.id} className="scroll-mt-24">
      <SectionFrame
        element={element}
        index={index}
        total={total}
        selected={selected}
        onSelect={onSelect}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onToggleHide={onToggleHide}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        dragListeners={listeners as unknown as Record<string, unknown>}
      />
    </div>
  );
}

/** Drag wrapper for a build-your-own block (tile/text/image/...) placed in a
 *  section page. Centered in a content column so a lone tile looks intentional. */
function SortableBlock({
  element,
  index,
  total,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onUpdate,
}: {
  element: BuilderElement;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} data-section-id={element.id} className="scroll-mt-24">
      <div className="relative mx-auto w-full max-w-3xl px-4 py-6">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to reorder block"
          title="Drag to reorder"
          className="absolute -left-1 top-4 z-30 hidden h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-[#221019]/12 bg-white/80 text-[#221019]/40 shadow-sm backdrop-blur transition-opacity hover:text-[#FF0099] active:cursor-grabbing sm:flex"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <EditableWrapper
          elementId={element.id}
          onSelect={onSelect}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onOpenProps={onSelect}
          isFirst={index === 0}
          isLast={index === total - 1}
          label={element.type}
        >
          <ElementRenderer
            element={element}
            editable
            isSelected={selected}
            onUpdate={onUpdate}
            onClick={onSelect}
          />
        </EditableWrapper>
      </div>
    </div>
  );
}

/** Read-only render of one page element for visitors/preview (section or block). */
function PublicElement({ element }: { element: BuilderElement }) {
  if (isSectionType(element.type)) {
    return <SectionRenderer element={element} />;
  }
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <ElementRenderer element={element} />
    </div>
  );
}

export function CmsPageWrapper({ slug, children }: Props) {
  const hasPublished = useCms((s) => s.hasPublishedPage(slug));
  const page = useCms((s) => s.pages[slug]);
  const setPageElements = useCms((s) => s.setPageElements);
  const publishPage = useCms((s) => s.publishPage);
  const confirm = useConfirm();

  const isEditMode = useEditMode((s) => s.isEditMode);
  const pageSlug = useEditMode((s) => s.pageSlug);
  const selectedElementId = useEditMode((s) => s.selectedElementId);
  const setSelectedElement = useEditMode((s) => s.setSelectedElement);
  const isPreview = useEditMode((s) => s.isPreview);
  const setPreview = useEditMode((s) => s.setPreview);

  const elements = useBuilder((s) => s.elements);
  const isEditing = isEditMode && pageSlug === slug;

  // This page is a SECTION page if it has registered sections, or its saved/
  // published content is a section list. Custom /p pages use the generic blocks.
  const sectionMode = pageHasSections(slug) || isSectionList(page?.elements);

  const [outlineOpen, setOutlineOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = useCms.getState().subscribe();
    return unsubscribe;
  }, []);

  // Seed the editor canvas when entering edit mode.
  useEffect(() => {
    if (!isEditing) return;
    const pg = useCms.getState().pages[slug];
    // A section page loads a saved draft if it contains at least one real
    // section (i.e. it came from the new builder — possibly mixed with custom
    // tiles/blocks). A PURE legacy generic-block draft (from the old builder)
    // is ignored and replaced with the real sections, so the canvas never
    // shows "Unknown section" nonsense.
    const savedUsable =
      pg && pg.elements.length > 0 &&
      (!sectionMode || pg.elements.some((e) => isSectionType(e.type)));
    if (savedUsable) {
      useBuilder.setState({ elements: JSON.parse(JSON.stringify(pg!.elements)), selectedId: null });
    } else if (sectionMode) {
      useBuilder.setState({ elements: seedSectionsForPage(slug), selectedId: null });
    } else {
      const snapFn = PAGE_SNAPSHOTS[slug];
      const seed = snapFn
        ? snapFn()
        : [
            { id: uuid(), type: "heading" as const, props: getDefaultPropsForType("heading") },
            { id: uuid(), type: "text" as const, props: getDefaultPropsForType("text") },
          ];
      useBuilder.setState({ elements: seed, selectedId: null });
    }
    useBuilder.getState().resetHistory();
  }, [isEditing, slug, sectionMode]);

  // In the section builder, also turn on inline click-to-edit so text/photos
  // are editable directly on the canvas alongside the structural controls.
  useEffect(() => {
    if (isEditing && sectionMode) {
      useInlineEdit.getState().set(true);
      return () => useInlineEdit.getState().set(false);
    }
  }, [isEditing, sectionMode]);

  const handleAddElement = useCallback((type: ElementType) => {
    const el: BuilderElement = { id: uuid(), type, props: getDefaultPropsForType(type) };
    useBuilder.setState((s) => ({ elements: [...s.elements, el], selectedId: el.id }));
    useEditMode.setState({ selectedElementId: el.id });
  }, []);

  // Add either a pre-built section OR a build-your-own block (tile, text,
  // image, button...). Both live in the same page list and are reorderable.
  const handleAdd = useCallback((type: string) => {
    let el: BuilderElement;
    if (isSectionType(type)) {
      const def = getSectionDef(type);
      el = { id: uuid(), type, props: { visible: true, ...(def?.defaultProps ?? {}) } };
    } else {
      el = { id: uuid(), type: type as ElementType, props: getDefaultPropsForType(type as ElementType) };
    }
    useBuilder.setState((s) => ({ elements: [...s.elements, el], selectedId: el.id }));
    useEditMode.setState({ selectedElementId: el.id });
  }, []);

  const handleSave = useCallback(() => {
    return setPageElements(slug, useBuilder.getState().elements);
  }, [slug, setPageElements]);

  const handlePublish = useCallback(async () => {
    const okSave = await setPageElements(slug, useBuilder.getState().elements);
    const okPublish = await publishPage(slug);
    return okSave && okPublish;
  }, [slug, setPageElements, publishPage]);

  const handleReset = useCallback(() => {
    if (sectionMode) {
      useBuilder.setState({ elements: seedSectionsForPage(slug), selectedId: null });
    } else {
      const snapFn = PAGE_SNAPSHOTS[slug];
      useBuilder.setState({ elements: snapFn ? snapFn() : [], selectedId: null });
    }
    useEditMode.setState({ selectedElementId: null });
    if (isSystemSlug(slug)) useCms.getState().unpublishPage(slug);
  }, [slug, sectionMode]);

  const handleUnpublish = useCallback(() => useCms.getState().unpublishPage(slug), [slug]);
  const handleListVersions = useCallback(() => useCms.getState().listVersions(slug), [slug]);
  const handleRestoreVersion = useCallback(
    (els: BuilderElement[]) => {
      useBuilder.setState({ elements: JSON.parse(JSON.stringify(els)), selectedId: null });
      useCms.getState().restoreVersion(slug, els);
    },
    [slug],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedElement(id);
    useBuilder.setState({ selectedId: id });
  }, [setSelectedElement]);

  const handleDelete = useCallback(async (id: string) => {
    const el = useBuilder.getState().elements.find((e) => e.id === id);
    const label = el
      ? (isSectionType(el.type) ? getSectionDef(el.type)?.label ?? el.type : el.type)
      : "this block";
    const ok = await confirm({
      title: `Delete “${label}”?`,
      description:
        "It will be removed from the page. You can undo with Ctrl+Z, or Save/Publish to make the change permanent.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    useBuilder.setState((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    useEditMode.setState({ selectedElementId: null });
  }, [confirm]);

  const handleDuplicate = useCallback((id: string) => {
    useBuilder.setState((s) => {
      const idx = s.elements.findIndex((e) => e.id === id);
      if (idx === -1) return s;
      const orig = s.elements[idx];
      const dup: BuilderElement = { ...orig, id: uuid(), props: JSON.parse(JSON.stringify(orig.props)) };
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

  const handleToggleHide = useCallback((id: string) => {
    useBuilder.setState((s) => ({
      elements: s.elements.map((e) =>
        e.id === id
          ? { ...e, props: { ...e.props, visible: (e.props as { visible?: boolean }).visible === false } }
          : e,
      ),
    }));
  }, []);

  const handleUpdate = useCallback((id: string, props: Record<string, unknown>) => {
    useBuilder.setState((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, props: { ...e.props, ...props } } : e)),
    }));
  }, []);

  const handleOutlineSelect = useCallback((id: string) => {
    handleSelect(id);
    if (typeof document !== "undefined") {
      document.querySelector(`[data-section-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [handleSelect]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

  // ─────────────────────────── PUBLISHED OVERRIDE (not editing) ───────────────────────────
  if (hasPublished && page && !isEditing) {
    // Section pages render a published list (sections + any custom blocks)
    // full-bleed, as long as it contains at least one real section.
    if (page.elements.some((el) => isSectionType(el.type))) {
      return (
        <>
          <Navbar />
          <main className="flex-1">
            {page.elements.map((el) => (
              <PublicElement key={el.id} element={el} />
            ))}
          </main>
          <Footer />
        </>
      );
    }
    // Custom /p pages render their generic block override. A section page with
    // a stale non-section override is ignored (falls through to coded design).
    if (!pageHasSections(slug)) {
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
        </>
      );
    }
  }

  // ─────────────────────────── PREVIEW-AS-VISITOR ───────────────────────────
  if (isEditing && isPreview) {
    return (
      <>
        {sectionMode ? (
          <>
            <Navbar />
            <main className="flex-1">
              {elements.map((el) => (
                <PublicElement key={el.id} element={el} />
              ))}
            </main>
            <Footer />
          </>
        ) : (
          <>
            <Navbar />
            <main className="min-h-screen pt-[88px]">
              <section className="grain relative bg-[#FDFCF7]">
                <div className="absolute inset-0 pattern-dots opacity-[0.04]" aria-hidden="true" />
                <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
                  <div className="space-y-6">
                    {elements.map((el) => (
                      <ElementRenderer key={el.id} element={el} />
                    ))}
                  </div>
                </div>
              </section>
            </main>
            <Footer />
          </>
        )}
        <button
          type="button"
          onClick={() => setPreview(false)}
          className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-[#221019] px-5 py-2.5 text-sm font-semibold text-white shadow-2xl hover:brightness-125"
        >
          Exit preview — back to editing
        </button>
      </>
    );
  }

  // ─────────────────────────── SECTION BUILDER (editing) ───────────────────────────
  if (isEditing && sectionMode) {
    return (
      <>
        <SectionToolbar
          onAddSection={() => setAddOpen(true)}
          outlineOpen={outlineOpen}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          onSave={handleSave}
          onPublish={handlePublish}
          slug={slug}
          isSystem={isSystemSlug(slug)}
          onReset={handleReset}
          onUnpublish={handleUnpublish}
          onListVersions={handleListVersions}
          onRestoreVersion={handleRestoreVersion}
        />

        <BuilderCoach />

        {outlineOpen && (
          <aside className="fixed left-0 top-10 z-[60] hidden h-[calc(100vh-2.5rem)] w-56 border-r border-white/10 bg-[#1A0814] text-white lg:block">
            <SectionOutline
              onSelect={handleOutlineSelect}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onToggleHide={handleToggleHide}
            />
          </aside>
        )}

        <div
          className={`pt-10 transition-[padding] ${outlineOpen ? "lg:pl-56" : ""} ${selectedElementId ? "lg:pr-72" : ""}`}
          onClick={() => setSelectedElement(null)}
        >
          <Navbar />
          <main className="flex-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={elements.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                {elements.length === 0 ? (
                  <div className="flex min-h-[50vh] items-center justify-center p-10">
                    <button
                      type="button"
                      onClick={() => setAddOpen(true)}
                      className="rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:brightness-110"
                    >
                      + Add your first section
                    </button>
                  </div>
                ) : (
                  elements.map((el, i) =>
                    isSectionType(el.type) ? (
                      <SortableSectionFrame
                        key={el.id}
                        element={el}
                        index={i}
                        total={elements.length}
                        selected={selectedElementId === el.id}
                        onSelect={() => handleSelect(el.id)}
                        onMoveUp={() => handleMoveUp(el.id)}
                        onMoveDown={() => handleMoveDown(el.id)}
                        onDuplicate={() => handleDuplicate(el.id)}
                        onDelete={() => handleDelete(el.id)}
                        onToggleHide={() => handleToggleHide(el.id)}
                      />
                    ) : (
                      <SortableBlock
                        key={el.id}
                        element={el}
                        index={i}
                        total={elements.length}
                        selected={selectedElementId === el.id}
                        onSelect={() => handleSelect(el.id)}
                        onDelete={() => handleDelete(el.id)}
                        onDuplicate={() => handleDuplicate(el.id)}
                        onMoveUp={() => handleMoveUp(el.id)}
                        onMoveDown={() => handleMoveDown(el.id)}
                        onUpdate={(props) => handleUpdate(el.id, props)}
                      />
                    ),
                  )
                )}
              </SortableContext>
            </DndContext>
          </main>
          <Footer />
        </div>

        <SectionPropsPanel />
        <InlinePropsPanel />
        <AddSectionDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          presentTypes={elements.map((e) => e.type)}
          onAdd={handleAdd}
        />
      </>
    );
  }

  // ─────────────────────────── GENERIC BLOCK BUILDER (custom /p pages) ───────────────────────────
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

  // Normal view (not editing, no override).
  return <>{children}</>;
}
