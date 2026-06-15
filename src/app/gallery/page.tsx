"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { GalleryHero } from "@/components/sections/gallery/gallery-hero";
import { GalleryGrid } from "@/components/sections/gallery/gallery-grid";
import { GalleryStats } from "@/components/sections/gallery/gallery-stats";

/**
 * Gallery is decomposed into editable sections (see gallery-sections.tsx).
 * The coded body below renders the same section components in the same order
 * as the registry, so the page the visitor sees matches the section list the
 * editor seeds. CmsPageWrapper swaps in the published/edited version when one
 * exists; otherwise this coded design renders as-is.
 */
export default function GalleryPage() {
  return (
    <CmsPageWrapper slug="gallery">
      <Navbar />
      <main className="canvas-editorial min-h-screen pt-[88px]">
        <GalleryHero />
        <GalleryGrid />
        <GalleryStats />
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
