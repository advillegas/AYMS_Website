import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Travel Gallery — Where We've Been",
  description:
    "Relive past Latina group trips to Thailand, Peru, Egypt, Japan, Colombia, Costa Rica, Greece, Spain, Bali & more. " +
    "Real photos, real amigas, real memories.",
  openGraph: {
    title: "Latina Travel Gallery | Amigas Y Más Social",
    description:
      "Photos and memories from our Latina group trips around the world.",
  },
  alternates: {
    canonical: "/gallery",
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
