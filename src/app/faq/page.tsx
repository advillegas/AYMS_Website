"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CmsPageWrapper } from "@/components/admin/cms-page-wrapper";
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
import { useFaqContent } from "@/lib/use-site-content";

export default function FAQPage() {
  const [search, setSearch] = useState("");
  const reduceMotion = useReducedMotion();
  const { categories } = useFaqContent();

  const filteredCategories = categories.map((cat) => ({
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
    <CmsPageWrapper slug="faq">
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
    </CmsPageWrapper>
  );
}
