"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, HelpCircle } from "lucide-react";
import { useFaqContent } from "@/lib/use-site-content";
import { EditableText } from "@/components/inline/editable-text";

/**
 * Searchable FAQ accordion. Keeps the sticky search box and the categorized
 * accordion together so the live filter state stays in one component. The
 * questions/answers come from `useFaqContent()` (edited in Admin → Content).
 */
export function FaqList() {
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
    <>
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
              <EditableText as="p" id="faq.empty.title" className="font-display text-lg text-ink">No matches yet, amiga</EditableText>
              <EditableText as="p" id="faq.empty.subtitle" className="text-sm text-ink-soft mt-1">
                Try another word — or just ask us, we&apos;re here ♡
              </EditableText>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-5 rounded-full border border-[#221019]/15 px-5 py-1.5 text-sm font-semibold text-[#B51760] transition-colors hover:bg-[#FF0099]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                >
                  <EditableText as="span" id="faq.empty.reset">Clear search</EditableText>
                </button>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </>
  );
}
