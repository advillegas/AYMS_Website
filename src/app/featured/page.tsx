"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { FeaturedSpotlight } from "@/components/landing/featured-spotlight";

export default function FeaturedPage() {
  return (
    <>
      <Navbar />
      <main className="canvas-editorial min-h-screen pt-[88px]">
        <FeaturedSpotlight />
      </main>
      <Footer />
    </>
  );
}
