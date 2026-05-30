"use client";

import { useEffect, useCallback } from "react";
import { useCms } from "@/lib/cms-store";
import { useEditMode } from "@/lib/edit-mode";
import { useAuth } from "@/lib/store";
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

interface Props {
  slug: string;
  children: React.ReactNode;
}

export function CmsPageWrapper({ slug, children }: Props) {
  const loadFromStorage = useCms((s) => s.loadFromStorage);
  const hasPublished = useCms((s) => s.hasPublishedPage(slug));
  const page = useCms((s) => s.pages[slug]);
  const setPageElements = useCms((s) => s.setPageElements);
  const publishPage = useCms((s) => s.publishPage);
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === "admin";

  const isEditMode = useEditMode((s) => s.isEditMode);
  const pageSlug = useEditMode((s) => s.pageSlug);
  const selectedElementId = useEditMode((s) => s.selectedElementId);
  const setSelectedElement = useEditMode((s) => s.setSelectedElement);

  const elements = useBuilder((s) => s.elements);

  const isEditing = isEditMode && pageSlug === slug;

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

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

  // Published CMS override (NOT editing)
  if (hasPublished && page && !isEditing) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-[88px]">
          <section className="relative bg-[#1A0814]">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A]/30 to-[#1A0814]" />
            <div className="absolute inset-0 pattern-dots opacity-5" />
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
        />

        <div className="pt-10" onClick={() => setSelectedElement(null)}>
          <Navbar />
          <main className="min-h-screen pt-[88px]">
            <div className="relative bg-[#1A0814] min-h-[60vh]">
              <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F2A]/20 to-[#1A0814]" />
              <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 space-y-4">
                {elements.map((el, i) => (
                  <EditableWrapper
                    key={el.id}
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
                ))}
              </div>
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
