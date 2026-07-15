import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo-config";

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("quiz", {
    title: "Travel Quiz — Find Your Destination",
    description:
      "Answer a few quick questions and discover which Amigas Y Más Social destination is your perfect match — then find the trip made for you.",
    canonical: "/quiz",
  });
}

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
