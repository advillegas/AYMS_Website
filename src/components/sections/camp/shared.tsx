"use client";

/** Shared scroll-reveal easing used across the camp sections. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// The hardcoded Stripe "buy" buttons that used to live here were replaced
// by the admin-editable CTA buttons — see camp-cta-buttons.tsx. Buttons
// (label, link, visibility, order) are managed from the in-place editor
// and default to the waitlist lead-capture flow.
