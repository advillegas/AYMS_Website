"use client";

import { ArrowRight } from "lucide-react";

/** Stripe Checkout links — pay in full, or split into two payments. */
export const CHECKOUT_FULL = "https://buy.stripe.com/cNi7sM4nsdRp2Ga6s88IU0C";
export const CHECKOUT_SPLIT = "https://buy.stripe.com/aFa14o2fkcNl1C6g2I8IU0F";

/** Shared scroll-reveal easing used across the camp sections. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CheckoutButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <a
        href={CHECKOUT_FULL}
        target="_blank"
        rel="noopener noreferrer"
        className="lift inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-8 py-3 text-base font-semibold text-white shadow-[0_8px_24px_rgb(255_0_153/0.3)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF7]"
      >
        Save Your Spot
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
      <a
        href={CHECKOUT_SPLIT}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#FF0099]/30 bg-white px-8 py-3 text-base font-semibold text-[#B51760] transition-colors hover:bg-[#FF0099]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]/40"
      >
        Pay in 2
      </a>
    </div>
  );
}
