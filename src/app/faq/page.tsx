"use client";

import { useState } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, HelpCircle } from "lucide-react";
import Link from "next/link";

const FAQ_DATA = [
  {
    category: "Trips & Booking",
    items: [
      { q: "Do you offer payment plans?", a: "Sí! All of our tours are available with a payment plan option. You can secure your spot with a deposit and pay the remaining balance in installments before the trip. Details are provided on each trip's detail page and at checkout." },
      { q: "Are flights included?", a: "International flights are not included in the trip price. You will book your own flight from your home airport and we will meet up at the destination airport. Domestic flights within the trip itinerary are included when specified." },
      { q: "What if I need to cancel?", a: "We understand plans change. Deposits are non-refundable but may be transferable to a future trip depending on timing. Full cancellation details are provided in our travel agreement when you book." },
      { q: "How many Amigas come on a tour?", a: "On average our groups have 12–20 amigas plus the group tour leader. We keep groups intimate to ensure everyone bonds and has an amazing experience. Popular trips may add additional spots." },
      { q: "What ages come on the tours?", a: "We welcome women 21+ but typically our groups are made up of women in their late 20s to mid 50s. All ages are welcome — what matters is the vibes!" },
    ],
  },
  {
    category: "Travel & Logistics",
    items: [
      { q: "Do I have to live in California to join?", a: "Not at all! We have amigas joining us from all over — CA, NY, TX, FL, IL, NV, AZ, GA, and many more states. We've even had amigas join from other countries. Everyone is welcome!" },
      { q: "Do I need travel insurance?", a: "Travel insurance is not required but highly recommended. We suggest coverage for trip cancellation, luggage loss, and healthcare costs abroad. We can recommend providers during our group Zoom call." },
      { q: "What if I'm a solo traveler?", a: "Most of our amigas travel solo — that's the whole point! You'll be matched with a roommate or can opt for a single supplement. By the time you land, you'll already feel like you've known everyone for years." },
      { q: "What's included in the trip price?", a: "Each trip varies, but generally: accommodations, most meals, all excursions and activities, local transportation, and airport transfers. Check each trip's detail page for the full breakdown." },
    ],
  },
  {
    category: "Community & Membership",
    items: [
      { q: "How do I join the AYMS community?", a: "Just create an account on our website! Membership is free and gives you access to our community portal with chat channels, event calendar, member directory, and exclusive content." },
      { q: "Do I have to go on a trip to be part of the community?", a: "Absolutely not! Many of our amigas are active community members who attend local events, join online chats, and connect with others before ever booking a trip. All are welcome." },
      { q: "What are Coffee & Cuties events?", a: "Coffee & Cuties are our monthly local meetups where amigas gather for coffee, brunch, or activities in a casual setting. It's a great way to meet other amigas in person, especially if you're new!" },
      { q: "How do I stay updated on new trips and events?", a: "Follow us on Instagram @amigasymassocial, join our newsletter from the homepage, and keep your community portal notifications on. We announce new trips and events across all channels." },
    ],
  },
  {
    category: "Safety & Support",
    items: [
      { q: "Is it safe to travel with a group?", a: "Safety is our top priority. All destinations are thoroughly vetted, we use trusted local partners, and our trip leaders are experienced travelers. We also have a mandatory pre-trip Zoom call to cover safety guidelines." },
      { q: "What if I have dietary restrictions?", a: "We accommodate all dietary needs! Just let us know when you book and we'll make sure every meal works for you. Our local partners are always prepared for vegetarian, vegan, gluten-free, and allergy requirements." },
      { q: "What happens in case of an emergency during a trip?", a: "Our trip leaders carry emergency contacts, local hospital info, and embassy details for every destination. We also share an emergency protocol during our pre-trip Zoom call. You're never alone with AYMS." },
    ],
  },
];

export default function FAQPage() {
  const [search, setSearch] = useState("");

  const filteredCategories = FAQ_DATA.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => cat.items.length > 0);

  const totalResults = filteredCategories.reduce((s, c) => s + c.items.length, 0);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#1a0a12] py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1f0d16] to-[#0d060a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,oklch(0.40_0.14_340/0.15),transparent)]" />
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <HelpCircle className="mx-auto h-12 w-12 text-[#FFB3D0]/60 mb-4" />
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-white sm:text-5xl">
              Frequently Asked{" "}
              <span className="bg-gradient-to-r from-[#FFB3D0] via-[#E8458B] to-[#D4A56A] bg-clip-text text-transparent">
                Questions
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-white/50">
              Everything you need to know about traveling with AYMS.
              Can&apos;t find your answer? Reach out to us anytime.
            </p>
          </div>
        </section>

        {/* Search */}
        <section className="border-b border-rosa/15 bg-background">
          <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="pl-9 border-rosa/20 focus-visible:ring-primary/30"
              />
            </div>
            {search && (
              <p className="mt-2 text-xs text-muted-foreground">
                {totalResults} result{totalResults !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
        </section>

        {/* FAQ content */}
        <section className="relative py-12">
          <div className="absolute inset-0 pattern-grid opacity-10" />
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
            {filteredCategories.map((cat) => (
              <div key={cat.category}>
                <h2 className="text-lg font-bold font-[family-name:var(--font-heading)] text-primary mb-4">
                  {cat.category}
                </h2>
                <Accordion className="space-y-2">
                  {cat.items.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={`${cat.category}-${i}`}
                      className="rounded-xl border border-rosa/15 bg-card px-5 overflow-hidden data-[state=open]:border-primary/25 data-[state=open]:shadow-md data-[state=open]:shadow-primary/5 transition-all"
                    >
                      <AccordionTrigger className="text-left text-sm font-semibold hover:text-primary py-4 [&>svg]:text-primary/50">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="py-20 text-center">
                <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-lg font-medium">No results found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-rosa/15 bg-gradient-to-b from-rosa/5 to-background py-16">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
              Still have questions?
            </h2>
            <p className="mt-2 text-muted-foreground">
              We&apos;re here to help. Reach out anytime and we&apos;ll get back
              to you within 24–48 hours.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/#contact"
                className={cn(buttonVariants(), "bg-gradient-to-r from-primary to-magenta text-white border-0 hover:opacity-90 px-8 font-semibold")}
              >
                Contact Us ♡
              </Link>
              <Link
                href="/trips"
                className={cn(buttonVariants({ variant: "outline" }), "border-primary/25 hover:bg-primary/5 px-8 font-semibold")}
              >
                Browse Trips
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
