import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { TermsBody } from "@/components/sections/legal/terms-body";

// All visible copy lives in TermsBody, where every heading/paragraph is
// click-to-edit for admins (cms_config overrides, "terms.*" ids).

export const metadata: Metadata = {
  // Root layout applies the "%s | Amigas Y Más Social" template.
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Amigas Y Más Social website, " +
    "community platform, trips, and events.",
  openGraph: {
    title: "Terms of Service | Amigas Y Más Social",
    description:
      "The terms that govern your use of Amigas Y Más Social.",
  },
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  return (
    <>
      <Navbar />
      <main className="canvas-editorial min-h-screen pt-[88px]">
        <TermsBody />
      </main>
      <Footer />
    </>
  );
}
