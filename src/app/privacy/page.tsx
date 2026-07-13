import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PrivacyBody } from "@/components/sections/legal/privacy-body";

// All visible copy lives in PrivacyBody, where every heading/paragraph is
// click-to-edit for admins (cms_config overrides, "privacy.*" ids).

export const metadata: Metadata = {
  // Root layout applies the "%s | Amigas Y Más Social" template.
  title: "Privacy Policy",
  description:
    "How Amigas Y Más Social collects, uses, shares, and protects your personal " +
    "information across our website and community platform.",
  openGraph: {
    title: "Privacy Policy | Amigas Y Más Social",
    description:
      "How we collect, use, and protect your information at Amigas Y Más Social.",
  },
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="canvas-editorial min-h-screen pt-[88px]">
        <PrivacyBody />
      </main>
      <Footer />
    </>
  );
}
