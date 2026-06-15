"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { EventsHero } from "@/components/sections/events/events-hero";
import { EventsBody } from "@/components/sections/events/events-body";
import { EventsCta } from "@/components/sections/events/events-cta";

export default function EventsPage() {
  return (
    <CmsPageWrapper slug="events">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        <EventsHero />
        <EventsBody />
        <EventsCta />
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
