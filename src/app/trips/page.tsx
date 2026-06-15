import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
import { TripsHero } from "@/components/sections/trips/trips-hero";
import { TripsGrid } from "@/components/sections/trips/trips-grid";
import { TripsHowTo } from "@/components/sections/trips/trips-howto";

/**
 * The /trips page is decomposed into editable sections (see TRIPS_SECTIONS).
 * By default it renders the same section components in the same order, so the
 * coded page is pixel-identical to the section-builder version. CmsPageWrapper
 * swaps in the published/edited section list when an admin saves one.
 */
export default function TripsPage() {
  return (
    <CmsPageWrapper slug="trips">
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        <TripsHero />
        <TripsGrid />
        <TripsHowTo />
      </main>
      <Footer />
    </CmsPageWrapper>
  );
}
