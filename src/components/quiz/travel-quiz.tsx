"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, RotateCcw, Sparkles, Check, MapPin, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrips } from "@/lib/use-trips";
import { useAuth } from "@/lib/store";
import { useConcierge } from "@/lib/use-concierge";
import { trackEvent } from "@/lib/activity-tracker";
import {
  QUIZ_QUESTIONS,
  accumulateTraits,
  matchDestination,
  rankDestinations,
  findMatchingTrip,
  type QuizOption,
} from "@/lib/travel-quiz";

type Phase = "intro" | "quiz" | "result";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TravelQuiz() {
  const prefersReducedMotion = useReducedMotion();
  const { trips } = useTrips();
  const user = useAuth((s) => s.user);
  const { submitting, submit } = useConcierge();

  const [phase, setPhase] = useState<Phase>("intro");
  // One selected option per answered question (index-aligned to QUIZ_QUESTIONS).
  const [answers, setAnswers] = useState<(QuizOption | null)[]>(
    () => QUIZ_QUESTIONS.map(() => null),
  );
  const [current, setCurrent] = useState(0);

  // Lead-capture form state.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);

  const total = QUIZ_QUESTIONS.length;
  const answeredCount = answers.filter(Boolean).length;

  const result = useMemo(() => {
    if (phase !== "result") return null;
    const chosen = answers.filter((a): a is QuizOption => a !== null);
    const traits = accumulateTraits(chosen);
    const ranked = rankDestinations(traits);
    const best = matchDestination(traits);
    const trip = findMatchingTrip(best, trips);
    const runnerUp = ranked.find((d) => d.id !== best.id) ?? null;
    return { best, runnerUp, trip, traits };
  }, [phase, answers, trips]);

  function start() {
    setPhase("quiz");
    setCurrent(0);
  }

  function choose(option: QuizOption) {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = option;
      return next;
    });
    // Advance to the next question, or reveal the result on the last one.
    if (current < total - 1) {
      window.setTimeout(() => setCurrent((c) => c + 1), 160);
    } else {
      window.setTimeout(() => finish(), 200);
    }
  }

  function finish() {
    const chosen = answers.filter((a): a is QuizOption => a !== null);
    const traits = accumulateTraits(chosen);
    const best = matchDestination(traits);
    const trip = findMatchingTrip(best, trips);
    // Enrichment: fire-and-forget, attaches userId automatically if logged in.
    trackEvent("quiz_completed", {
      destinationId: best.id,
      destination: best.name,
      country: best.country,
      tripId: trip?.id ?? null,
      traits,
    });
    setPhase("result");
    // Prefill the capture form for a signed-in amiga.
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }

  function back() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  function retake() {
    setAnswers(QUIZ_QUESTIONS.map(() => null));
    setCurrent(0);
    setCaptured(false);
    setFormError(null);
    setPhase("intro");
  }

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("Please add your name.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setFormError("Please enter a valid email.");
      return;
    }
    const best = result?.best;
    const res = await submit({
      name: name.trim(),
      email: email.trim(),
      destination: best?.name,
      details: best
        ? `Travel quiz match: ${best.name}, ${best.country}. Send matching trips & tips.`
        : "Travel quiz lead.",
    });
    if (res.status === "error") {
      setFormError(res.message);
      return;
    }
    setCaptured(true);
  }

  const motionOff = !!prefersReducedMotion;

  return (
    <section className="canvas-editorial grain relative min-h-[70vh] overflow-hidden py-16 sm:py-24">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--magenta)]/25 to-transparent" />
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {/* ---------------------------------------------------------- INTRO */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={motionOff ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={motionOff ? undefined : { opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--magenta)]/30 bg-[var(--magenta)]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--brand-pink)]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Travel Quiz
              </span>
              <h1 className="mt-5 font-display text-4xl text-ink sm:text-5xl text-balance">
                Where should{" "}
                <span className="font-display-italic text-[var(--magenta)]">you</span> go
                next?
              </h1>
              <p className="mx-auto mt-4 max-w-md text-ink-soft leading-relaxed">
                Answer {total} quick questions and we&apos;ll match you with the AYMS
                destination made for your travel soul. Takes about a minute. ✈️
              </p>
              <Button
                onClick={start}
                size="lg"
                className="mt-8 bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)] text-white shadow-lg hover:opacity-95"
              >
                Start the quiz
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </Button>
            </motion.div>
          )}

          {/* -------------------------------------------------------- QUESTIONS */}
          {phase === "quiz" && (
            <motion.div
              key="quiz"
              initial={motionOff ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={motionOff ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Progress */}
              <div className="mb-8">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-soft">
                  <button
                    type="button"
                    onClick={back}
                    disabled={current === 0}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:text-ink disabled:opacity-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Back
                  </button>
                  <span>
                    Question {current + 1} of {total}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)]"
                    initial={false}
                    animate={{ width: `${((current + 1) / total) * 100}%` }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={QUIZ_QUESTIONS[current].id}
                  initial={motionOff ? false : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={motionOff ? undefined : { opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h2 className="text-center font-display text-2xl text-ink sm:text-3xl text-balance">
                    <span className="mr-2" aria-hidden="true">
                      {QUIZ_QUESTIONS[current].emoji}
                    </span>
                    {QUIZ_QUESTIONS[current].question}
                  </h2>
                  <div className="mt-8 grid gap-3">
                    {QUIZ_QUESTIONS[current].options.map((opt, i) => {
                      const selected = answers[current]?.text === opt.text;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => choose(opt)}
                          className={cn(
                            "group flex items-center gap-3 rounded-2xl border bg-white/70 px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--magenta)]",
                            selected
                              ? "border-[var(--magenta)] ring-2 ring-[var(--magenta)]/30"
                              : "border-ink/10 hover:border-[var(--magenta)]/40",
                          )}
                        >
                          {opt.emoji && (
                            <span className="text-2xl" aria-hidden="true">
                              {opt.emoji}
                            </span>
                          )}
                          <span className="flex-1 font-medium text-ink">{opt.text}</span>
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                              selected
                                ? "border-[var(--magenta)] bg-[var(--magenta)] text-white"
                                : "border-ink/20 text-transparent group-hover:border-[var(--magenta)]/50",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ----------------------------------------------------------- RESULT */}
          {phase === "result" && result && (
            <motion.div
              key="result"
              initial={motionOff ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-pink)]">
                Your destination match
              </p>

              {/* Match hero */}
              <div
                className={cn(
                  "relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br p-8 text-white shadow-xl",
                  result.best.gradient,
                )}
              >
                <div className="pointer-events-none absolute inset-0 pattern-dots opacity-10" aria-hidden="true" />
                <div className="relative">
                  <span className="text-6xl drop-shadow-lg" aria-hidden="true">
                    {result.best.emoji}
                  </span>
                  <h2 className="mt-3 font-display text-4xl sm:text-5xl">
                    {result.best.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium uppercase tracking-wide text-white/80">
                    {result.best.country}
                  </p>
                  <p className="mx-auto mt-4 max-w-md text-lg font-display-italic text-white/95">
                    {result.best.tagline}
                  </p>
                </div>
              </div>

              <p className="mx-auto mt-6 max-w-lg text-ink-soft leading-relaxed">
                {result.best.whyYou}
              </p>

              {/* Matching live trip (if the catalog has one) */}
              {result.trip ? (
                <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white/80 text-left shadow-sm">
                  <div className="flex items-center gap-4 p-4">
                    <span
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl",
                        result.trip.gradient,
                      )}
                      aria-hidden="true"
                    >
                      {result.trip.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg text-ink">
                        {result.trip.title}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-[var(--magenta)]" aria-hidden="true" />
                          {result.trip.dates}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[var(--magenta)]" aria-hidden="true" />
                          {result.trip.destination}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-lg text-ink">
                      ${result.trip.price.toLocaleString()}
                    </span>
                  </div>
                  <Link
                    href="/trips"
                    className="block bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)] py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-95"
                  >
                    {result.trip.status === "waitlist" || result.trip.status === "sold-out"
                      ? "Join the waitlist"
                      : `See the ${result.best.name} trip`}
                  </Link>
                </div>
              ) : (
                <Button
                  render={<Link href="/trips" />}
                  size="lg"
                  className="mt-6 bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)] text-white shadow-lg hover:opacity-95"
                >
                  Explore all trips
                </Button>
              )}

              {/* Lead-capture / enrichment */}
              {!captured ? (
                <form
                  onSubmit={handleCapture}
                  className="mx-auto mt-8 max-w-md rounded-2xl border border-ink/10 bg-white/70 p-5 text-left"
                >
                  <p className="font-display text-lg text-ink">
                    Want a personalized {result.best.name} plan?
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    Drop your email and we&apos;ll send trip dates, pricing & tips for your
                    match.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      aria-label="Your name"
                      autoComplete="name"
                    />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      aria-label="Your email"
                      type="email"
                      autoComplete="email"
                    />
                    {formError && (
                      <p className="text-sm text-destructive" role="alert">
                        {formError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)] text-white hover:opacity-95"
                    >
                      {submitting ? "Sending…" : "Send me my match ♡"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[var(--magenta)]/30 bg-[var(--magenta)]/5 p-5">
                  <p className="font-display text-lg text-ink">You&apos;re on the list! 🎉</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    We&apos;ll be in touch with your {result.best.name} details soon, amiga.
                  </p>
                </div>
              )}

              {/* Runner-up + retake */}
              {result.runnerUp && (
                <p className="mt-6 text-sm text-ink-soft">
                  Runner-up:{" "}
                  <span className="font-semibold text-ink">
                    {result.runnerUp.emoji} {result.runnerUp.name}
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={retake}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--magenta)] transition-colors hover:text-[var(--brand-pink)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Retake the quiz
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle helper on intro/quiz */}
        {phase !== "result" && answeredCount > 0 && phase === "quiz" && (
          <p className="mt-8 text-center text-xs text-ink-soft/60">
            {answeredCount}/{total} answered
          </p>
        )}
      </div>
    </section>
  );
}
