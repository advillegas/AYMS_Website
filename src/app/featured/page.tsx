"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { FeaturedSpotlight } from "@/components/landing/featured-spotlight";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";

export default function FeaturedPage() {
  return (
    <CmsPageWrapper slug="featured">
      <Navbar />
      <main className="canvas-editorial min-h-screen pt-[88px]">
        <FeaturedSpotlight />
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
