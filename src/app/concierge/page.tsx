"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { ConciergeHero } from "@/components/sections/concierge/concierge-hero";
import { ConciergeProblem } from "@/components/sections/concierge/concierge-problem";
import { ConciergeGuide } from "@/components/sections/concierge/concierge-guide";
import { ConciergeRegions } from "@/components/sections/concierge/concierge-regions";
import { ConciergePlan } from "@/components/sections/concierge/concierge-plan";
import { ConciergeStakes } from "@/components/sections/concierge/concierge-stakes";
import { ConciergeInquiry } from "@/components/sections/concierge/concierge-inquiry";

/**
 * Private concierge / full trip-planning service. Built on the StoryBrand
 * arc: the hero (prospect) has a problem, meets a guide (AYMS) who gives
 * them a plan, calls them to act, and shows the success vs. failure stakes.
 */
export default function ConciergePage() {
  return (
    <CmsPageWrapper slug="concierge">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        <ConciergeHero />
        <ConciergeProblem />
        <ConciergeGuide />
        <ConciergeRegions />
        <ConciergePlan />
        <ConciergeStakes />
        <ConciergeInquiry />
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
