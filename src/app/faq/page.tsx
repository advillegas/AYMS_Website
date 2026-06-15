"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { FaqHero } from "@/components/sections/faq/faq-hero";
import { FaqList } from "@/components/sections/faq/faq-list";
import { FaqCta } from "@/components/sections/faq/faq-cta";

export default function FAQPage() {
  // Body is composed of the same registered sections the editor uses, in order,
  // so the coded page and the section-builder output stay pixel-identical.
  return (
    <CmsPageWrapper slug="faq">
      <Navbar />
      <main className="flex-1">
        <FaqHero />
        <FaqList />
        <FaqCta />
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
