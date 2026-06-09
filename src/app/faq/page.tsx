"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();

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
      <main className="canvas-editorial min-h-screen pt-[88px]">
        {/* Hero — light editorial */}
        <section className="grain relative overflow-hidden canvas-editorial py-28">
          <div className="mesh-warm" />
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
          >
            <motion.div
              initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="glass-control mx-auto mb-6 flex h-16 w-16 items-center justify-center"
            >
              <HelpCircle className="h-8 w-8 text-[#B51760]" aria-hidden="true" />
            </motion.div>
            <p className="eyebrow text-[#B51760]">Got Questions? We&apos;ve Got Answers</p>
            <h1 className="text-hero font-display text-ink text-balance mt-3">
              Frequently{" "}
              <span className="font-display-italic marker-swipe text-[#B51760]">
                Asked
              </span>
            </h1>
            <p className="text-lead mx-auto mt-6 max-w-xl text-ink-soft">
              Everything you need to know about traveling with AYMS.
              Can&apos;t find your answer? Reach out to us anytime.
            </p>
          </motion.div>
        </section>

        {/* Search */}
        <section className="glass-nav border-b border-[#221019]/10 sticky top-[88px] z-10">
          <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B51760]" aria-hidden="true" />
              <label htmlFor="faq-search" className="sr-only">
                Search frequently asked questions
              </label>
              <Input
                id="faq-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="pl-9 rounded-full border-[#221019]/15 bg-white/70 text-ink placeholder:text-ink-soft focus-visible:ring-[#FF0099]/30"
              />
            </div>
            <p className="mt-2 text-xs text-ink-soft" aria-live="polite" role="status">
              {search ? `${totalResults} result${totalResults !== 1 ? "s" : ""} found` : ""}
            </p>
          </div>
        </section>

        {/* FAQ content */}
        <section className="relative py-16 canvas-editorial">
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-14">
            {filteredCategories.map((cat, catIdx) => (
              <motion.div
                key={cat.category}
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: reduceMotion ? 0 : catIdx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-6 flex items-center gap-4">
                  <h2 className="font-display text-title text-ink">
                    {cat.category.split(" ")[0]}{" "}
                    <span className="font-display-italic text-[#B51760]">
                      {cat.category.split(" ").slice(1).join(" ")}
                    </span>
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#B51760]/25 via-[#221019]/10 to-transparent" />
                </div>
                <Accordion className="divide-y divide-[#221019]/10 border-y border-[#221019]/10">
                  {cat.items.map((item, i) => (
                    <AccordionItem
                      key={i}
                      value={`${cat.category}-${i}`}
                      className="px-1 transition-colors data-[state=open]:bg-[#FF0099]/[0.03]"
                    >
                      <AccordionTrigger className="text-left font-display text-base text-ink hover:text-[#B51760] py-6 [&>svg]:text-[#B51760]/60">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-[15px] text-ink-soft leading-relaxed pb-6 pr-6">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            ))}

            {filteredCategories.length === 0 && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 text-center"
              >
                <div className="glass-control mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                  <HelpCircle className="h-7 w-7 text-ink-soft/60" aria-hidden="true" />
                </div>
                <p className="font-display text-lg text-ink">No matches yet, amiga</p>
                <p className="text-sm text-ink-soft mt-1">
                  Try another word — or just ask us, we&apos;re here ♡
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mt-5 rounded-full border border-[#221019]/15 px-5 py-1.5 text-sm font-semibold text-[#B51760] transition-colors hover:bg-[#FF0099]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                  >
                    Clear search
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA — glass "still have questions?" card */}
        <section className="relative overflow-hidden border-t border-[#221019]/10 canvas-warm py-20">
          <div className="mesh-warm opacity-70" />
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8"
          >
            <div className="glass-strong elevate-3 rounded-3xl px-8 py-12 text-center sm:px-12">
              <h2 className="font-display text-title text-ink">
                Still have{" "}
                <span className="font-display-italic marker-swipe text-[#B51760]">
                  questions?
                </span>
              </h2>
              <p className="mt-3 text-ink-soft">
                We&apos;re here to help. Reach out anytime and we&apos;ll get back
                to you within 24–48 hours.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/#contact"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "lift h-14 rounded-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-10 text-base font-semibold tracking-wide text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110"
                  )}
                >
                  Contact Us ♡
                </Link>
                <Link
                  href="/trips"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-14 rounded-full border-[#221019]/15 bg-white/40 text-ink hover:bg-[#FF0099]/5 px-10 font-semibold"
                  )}
                >
                  Browse Trips
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
