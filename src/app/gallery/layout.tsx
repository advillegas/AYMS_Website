import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo-config";

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("gallery", {
    title: "Travel Gallery — Where We've Been",
    description:
      "Relive past Latina group trips to Thailand, Peru, Egypt, Japan, Colombia, Costa Rica, Greece, Spain, Bali & more. " +
      "Real photos, real amigas, real memories.",
    canonical: "/gallery",
  });
}

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
