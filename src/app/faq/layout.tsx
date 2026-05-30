import type { Metadata } from "next";
import { FAQPageJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "FAQ — Traveling with Amigas Y Más Social",
  description:
    "Answers to common questions about Latina group trips, booking, payments, safety, " +
    "what's included, community membership, and traveling solo with AYMS.",
  openGraph: {
    title: "Frequently Asked Questions | Amigas Y Más Social",
    description:
      "Everything you need to know about traveling with the Latina travel community.",
  },
  alternates: {
    canonical: "/faq",
  },
};

const ALL_FAQS = [
  { q: "Do you offer payment plans?", a: "Sí! All of our tours are available with a payment plan option. You can secure your spot with a deposit and pay the remaining balance in installments before the trip." },
  { q: "Are flights included?", a: "International flights are not included in the trip price. Domestic flights within the trip itinerary are included when specified." },
  { q: "What if I need to cancel?", a: "Deposits are non-refundable but may be transferable to a future trip depending on timing. Full cancellation details are provided in our travel agreement." },
  { q: "How many Amigas come on a tour?", a: "On average our groups have 12–20 amigas plus the group tour leader. We keep groups intimate to ensure everyone bonds." },
  { q: "What ages come on the tours?", a: "We welcome women 21+ but typically our groups are made up of women in their late 20s to mid 50s." },
  { q: "Do I have to live in California to join?", a: "Not at all! We have amigas joining us from all over the US and even other countries." },
  { q: "What if I'm a solo traveler?", a: "Most of our amigas travel solo — that's the whole point! You'll be matched with a roommate or can opt for a single supplement." },
  { q: "What's included in the trip price?", a: "Generally: accommodations, most meals, all excursions and activities, local transportation, and airport transfers." },
  { q: "How do I join the AYMS community?", a: "Just create an account on our website! Membership is free and gives you access to our community portal with chat channels, event calendar, and member directory." },
  { q: "What are Coffee & Cuties events?", a: "Monthly local meetups where amigas gather for coffee, brunch, or activities in a casual setting. Great way to meet other amigas in person!" },
  { q: "Is it safe to travel with a group?", a: "Safety is our top priority. All destinations are thoroughly vetted, we use trusted local partners, and our trip leaders are experienced travelers." },
  { q: "What if I have dietary restrictions?", a: "We accommodate all dietary needs! Just let us know when you book and we'll make sure every meal works for you." },
];

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <FAQPageJsonLd items={ALL_FAQS} />
      {children}
    </>
  );
}
