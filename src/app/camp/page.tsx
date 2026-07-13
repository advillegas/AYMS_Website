"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { CampHero } from "@/components/sections/camp/camp-hero";
import { CampAbout } from "@/components/sections/camp/camp-about";
import { CampFeatures } from "@/components/sections/camp/camp-features";
import { CampGallery } from "@/components/sections/camp/camp-gallery";
import { CampInclusions } from "@/components/sections/camp/camp-inclusions";
import { CampTestimonials } from "@/components/sections/camp/camp-testimonials";
import { CampSponsors } from "@/components/sections/camp/camp-sponsors";
import { CampCta } from "@/components/sections/camp/camp-cta";

export default function CampPage() {
  return (
    <CmsPageWrapper slug="camp">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        <CampHero />
        <CampAbout />
        <CampFeatures />
        <CampGallery />
        <CampInclusions />
        <CampTestimonials />
        <CampSponsors />
        <CampCta />
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
