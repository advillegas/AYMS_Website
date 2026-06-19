"use client";

/**
 * Member Journey onboarding — a warm, 4-step welcome stepper shown once
 * to new members. It collects the highest-signal identity fields so the
 * profile (and friend matching) come alive immediately:
 *   1. Interests
 *   2. Languages
 *   3. Headline
 *   4. First passport stamp
 *
 * Answers persist to Firestore: profile fields via updateProfile() from
 * the auth store, and the first stamp via usePassport(). Local progress
 * (which step, completed/dismissed) lives in use-onboarding.ts so a
 * refresh resumes in place. Every step is skippable — this is a gentle
 * welcome, never a gate.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, ArrowRight, ArrowLeft, Check, Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/store";
import { useOnboarding } from "@/lib/use-onboarding";
import { usePassport } from "@/lib/use-passport";
import { pushNotification } from "@/lib/notify";
import { LANGUAGE_OPTIONS } from "@/lib/profile-constants";
import { TRIPS_DATA, PAST_TRIPS } from "@/lib/trips-data";
import {
  tripToStamp,
  pastTripToStamp,
  stampGradient,
} from "@/lib/game-data";
import { InterestPicker } from "./interest-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEP_COUNT = 4;

export function WelcomeJourney() {
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);
  const { step, next, back, complete, dismiss, setStep } = useOnboarding();
  const { addStamp } = usePassport(user?.id);
  const router = useRouter();

  // Onboarding always lands the new member in the live community home so the
  // finish moment leads somewhere warm instead of a dead-end toast.
  function finishAndLand() {
    complete();
    router.push("/community/home");
  }

  // Skipping/closing permanently marks the member onboarded so the popup never
  // reappears (the "only show once" requirement). It also skips the guided
  // tour — someone who opts out of setup shouldn't be handed a walkthrough.
  // updateProfile flips the store flags synchronously, so the overlay hides
  // immediately while the backend write happens in the background.
  function handleClose() {
    void updateProfile({ onboarded: true, tourDone: true });
    dismiss();
  }

  // Draft answers seeded from any existing profile data so re-runs don't
  // wipe a member who already filled things in.
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [languages, setLanguages] = useState<string[]>(user?.languages ?? []);
  const [headline, setHeadline] = useState<string>(user?.headline ?? "");
  const [pickedStamp, setPickedStamp] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const clampedStep = Math.min(step, STEP_COUNT - 1);

  // A small curated set of trips to stamp during onboarding.
  const stampChoices = useMemo(() => {
    const upcoming = TRIPS_DATA.slice(0, 4).map((t) => ({
      key: t.id,
      draft: tripToStamp(t),
    }));
    const past = PAST_TRIPS.slice(0, 4).map((p, i) => ({
      key: `past-${i}`,
      draft: pastTripToStamp(p),
    }));
    return [...upcoming, ...past];
  }, []);

  function toggleLanguage(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  async function finish() {
    if (saving || !user) {
      // No user → just close gracefully.
      finishAndLand();
      return;
    }
    setSaving(true);
    try {
      // Persist profile answers + mark onboarded so it never auto-shows again.
      await updateProfile({
        interests,
        languages,
        headline: headline.trim(),
        onboarded: true,
      });

      // Persist the chosen first stamp, if any.
      const chosen = stampChoices.find((c) => c.key === pickedStamp);
      if (chosen) {
        const id = await addStamp(chosen.draft);
        if (id) {
          void pushNotification(user.id, {
            kind: "passport",
            title: "Your first passport stamp 🛂",
            body: `You added ${chosen.draft.label} to your travel passport.`,
            actorId: user.id,
            actorName: user.name,
            href: "/community/profile",
          });
        }
      }

      // A warm welcome notification to anchor the bell.
      void pushNotification(user.id, {
        kind: "welcome",
        title: "Welcome to the familia 💕",
        body: "Your profile is set up — explore the community and say hi!",
        href: "/community",
      });

      finishAndLand();
      toast.success("You're all set — welcome, amiga! 💕");
    } catch (err) {
      console.error("[welcome-journey]", err);
      toast.error("Couldn't save everything, but you're in! You can finish your profile anytime.");
      finishAndLand();
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      title: "What lights you up?",
      subtitle: "Pick a few interests so amigas with the same passions can find you.",
      emoji: "🎨",
      body: (
        <InterestPicker selected={interests} onChange={setInterests} />
      ),
    },
    {
      title: "How do you connect?",
      subtitle: "Choose the languages you speak — connection has no borders.",
      emoji: "🗣️",
      body: (
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_OPTIONS.map((lang) => {
            const on = languages.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground/70 hover:border-primary/40",
                )}
              >
                {on && <Check className="h-3 w-3" />}
                {lang}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Introduce yourself",
      subtitle: "A one-line headline that captures your vibe. (You can change it anytime.)",
      emoji: "✨",
      body: (
        <div className="space-y-2">
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Beach lover, salsa dancer & forever amiga"
            maxLength={80}
            className="h-10"
          />
          <p className="text-[10px] text-muted-foreground">
            {headline.length}/80
          </p>
        </div>
      ),
    },
    {
      title: "Stamp your passport",
      subtitle: "Where have you been? Add your first stamp to start your travel story.",
      emoji: "🛂",
      body: (
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
          {stampChoices.map((c) => {
            const on = pickedStamp === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setPickedStamp(on ? null : c.key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left transition-colors",
                  on
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-rosa/20 hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg",
                    stampGradient(c.draft.country),
                  )}
                >
                  {c.draft.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {c.draft.label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {c.draft.year}
                  </span>
                </span>
                {on && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      ),
    },
  ];

  const current = steps[clampedStep];
  const isLast = clampedStep === STEP_COUNT - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden
        onClick={handleClose}
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to AYMS"
        className="glass-strong elevate-4 relative z-10 w-full max-w-md overflow-hidden rounded-3xl"
      >
        {/* Header band */}
        <div className="relative bg-gradient-to-r from-[#FF0099] to-[#B51760] px-5 py-4 text-white">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close and don't show again"
            title="Close — you won't see this again"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white/90 transition-colors hover:bg-white/25"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            <h2 className="font-heading text-base font-bold">
              Welcome to AYMS{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-white/85">
            Let&apos;s set up your profile so the familia can get to know you.
          </p>

          {/* Progress dots */}
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= clampedStep ? "bg-white" : "bg-white/30",
                )}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span aria-hidden>{current.emoji}</span>
            {current.title}
          </h3>
          <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
            {current.subtitle}
          </p>
          {current.body}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-rosa/20 bg-card/50 px-5 py-3">
          <div>
            {clampedStep > 0 ? (
              <Button variant="ghost" size="sm" onClick={back} disabled={saving}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={saving}
                className="text-muted-foreground"
              >
                Skip &amp; don&apos;t show again
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(clampedStep + 1)}
                disabled={saving}
                className="text-muted-foreground"
              >
                Skip
              </Button>
            )}
            {isLast ? (
              <Button
                size="sm"
                onClick={finish}
                disabled={saving}
                className="border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110"
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                {saving ? "Saving..." : "Finish"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={next}
                disabled={saving}
                className="border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110"
              >
                Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
