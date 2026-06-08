"use client";

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Marquee } from "@/components/landing/marquee";
import { About } from "@/components/landing/about";
import { WhyUs } from "@/components/landing/why-us";
import { Destinations } from "@/components/landing/destinations";
import { Camp } from "@/components/landing/camp";
import { Trips } from "@/components/landing/trips";
import { Experiences } from "@/components/landing/experiences";
import { Testimonials } from "@/components/landing/testimonials";
import { CommunityPreview } from "@/components/landing/community-preview";
import { Contact } from "@/components/landing/contact";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";

export default function Home() {
  return (
    <CmsPageWrapper slug="home">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Marquee />
        <About />
        <WhyUs />
        <Destinations />
        <Camp />
        <Trips />
        <Experiences />
        <Testimonials />
        <CommunityPreview />
        <Contact />
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
