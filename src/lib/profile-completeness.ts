/**
 * Pure profile-completeness scoring for the "Journey Ring".
 *
 * No React, no Firestore — just a weighted checklist over the rich
 * profile fields so the ring component and the "Fully You" badge share
 * one source of truth. Recognition-first: this nudges members to finish
 * their intro so the community can get to know them, never shames them.
 */

import type { User } from "./store";

export interface CompletenessStep {
  key: string;
  /** Short, warm checklist label. */
  label: string;
  /** Relative weight toward 100%. */
  weight: number;
  emoji: string;
  /** True when this part of the profile is filled in. */
  done: boolean;
}

export interface CompletenessResult {
  /** 0–100, rounded. */
  percent: number;
  steps: CompletenessStep[];
  /** Steps still left to do (done === false). */
  remaining: CompletenessStep[];
  complete: boolean;
}

function hasText(v: string | undefined | null): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function hasItems(v: unknown[] | undefined | null): boolean {
  return Array.isArray(v) && v.length > 0;
}

function hasLocation(u: User): boolean {
  return (
    hasText(u.location) ||
    hasItems(u.manualLocations) ||
    (typeof u.geoLat === "number" && typeof u.geoLng === "number")
  );
}

/**
 * Score a profile's completeness. Weights are tuned so the high-signal
 * identity fields (a headline, a bio, interests) move the needle most.
 */
export function getProfileCompleteness(user: User | null | undefined): CompletenessResult {
  if (!user) {
    return { percent: 0, steps: [], remaining: [], complete: false };
  }

  const steps: CompletenessStep[] = [
    { key: "avatar", label: "Add a profile photo", weight: 20, emoji: "📸", done: hasText(user.avatar) },
    { key: "headline", label: "Write a headline", weight: 15, emoji: "✨", done: hasText(user.headline) },
    { key: "bio", label: "Share a short bio", weight: 15, emoji: "💬", done: hasText(user.bio) || hasText(user.bioLong) },
    { key: "interests", label: "Pick your interests", weight: 15, emoji: "🎨", done: hasItems(user.interests) },
    { key: "languages", label: "Add languages you speak", weight: 10, emoji: "🗣️", done: hasItems(user.languages) },
    { key: "pronouns", label: "Set your pronouns", weight: 5, emoji: "🏷️", done: hasText(user.pronouns) },
    { key: "location", label: "Add where you're based", weight: 10, emoji: "📍", done: hasLocation(user) },
    { key: "gallery", label: "Upload a few photos", weight: 10, emoji: "🖼️", done: hasItems(user.galleryPhotos) },
  ];

  const totalWeight = steps.reduce((n, s) => n + s.weight, 0);
  const earned = steps.reduce((n, s) => n + (s.done ? s.weight : 0), 0);
  const percent = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100);

  return {
    percent,
    steps,
    remaining: steps.filter((s) => !s.done),
    complete: percent >= 100,
  };
}
