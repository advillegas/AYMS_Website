"use client";

/**
 * Concierge lead capture.
 *
 * Persists a trip-planning inquiry to the `concierge_inquiries` table
 * (public insert, admin-only read — see supabase/concierge-inquiries.sql)
 * and fires an in-app notification to the admin so a hot lead is never
 * missed. Degrades gracefully to a local "received" when no backend is
 * configured, so the marketing form never hard-fails for a visitor.
 *
 * Mirrors the newsletter capture pattern (use-newsletter.ts): client write
 * with a friendly result object; no email is sent here.
 */

import { useState, useCallback } from "react";
import { getSupabase, useSupabaseBackend } from "./supabase";
import { pushNotification } from "./notify";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ConciergeInquiryInput {
  name: string;
  email: string;
  phone?: string;
  destination?: string;
  travelDates?: string;
  partySize?: string;
  budget?: string;
  details?: string;
}

export type ConciergeSubmitStatus = "sent" | "local" | "error";

export interface ConciergeSubmitResult {
  status: ConciergeSubmitStatus;
  message: string;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const OK_MESSAGE =
  "Gracias, amiga! Your request is in — we'll reach out within 1–2 business days. ♡";

export async function submitConciergeInquiry(
  input: ConciergeInquiryInput,
): Promise<ConciergeSubmitResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) {
    return { status: "error", message: "Please add your name." };
  }
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  // No backend configured (local dev): accept gracefully.
  if (!useSupabaseBackend) {
    return { status: "local", message: OK_MESSAGE };
  }
  const sb = getSupabase();
  if (!sb) return { status: "local", message: OK_MESSAGE };

  const id = generateId();
  const { error } = await sb.from("concierge_inquiries").insert({
    id,
    name,
    email,
    phone: input.phone?.trim() || null,
    destination: input.destination?.trim() || null,
    travel_dates: input.travelDates?.trim() || null,
    party_size: input.partySize?.trim() || null,
    budget: input.budget?.trim() || null,
    details: input.details?.trim() || null,
    status: "new",
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[concierge] submit failed", error.message);
    return {
      status: "error",
      message: "Something went wrong. Please try again, or email us directly.",
    };
  }

  // Best-effort heads-up to the owner. Never block the visitor's success on it.
  const summary = [input.destination?.trim(), input.travelDates?.trim()]
    .filter(Boolean)
    .join(" · ");
  void pushNotification("admin", {
    kind: "system",
    title: `New concierge inquiry — ${name}`,
    body: summary ? `${email} · ${summary}` : email,
    href: "/community",
  });

  return { status: "sent", message: OK_MESSAGE };
}

export interface UseConciergeResult {
  submitting: boolean;
  submit: (input: ConciergeInquiryInput) => Promise<ConciergeSubmitResult>;
}

export function useConcierge(): UseConciergeResult {
  const [submitting, setSubmitting] = useState(false);
  const submit = useCallback(async (input: ConciergeInquiryInput) => {
    setSubmitting(true);
    try {
      return await submitConciergeInquiry(input);
    } finally {
      setSubmitting(false);
    }
  }, []);
  return { submitting, submit };
}
