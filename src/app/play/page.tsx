"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QUIZ_QUESTIONS,
  MAP_CITIES,
  STORIES,
  DESTINATIONS,
  matchDestination,
  type MapCity,
  type StoryNode,
  type Destination,
} from "@/lib/game-data";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Map,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Globe,
  Compass,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

type GameMode = "menu" | "quiz" | "quiz-result" | "map" | "story";

export default function PlayPage() {
  const [mode, setMode] = useState<GameMode>("menu");
  const [quizStep, setQuizStep] = useState(0);
  const [traits, setTraits] = useState<Record<string, number>>({});
  const [matchedDest, setMatchedDest] = useState<Destination | null>(null);
  const [selectedCity, setSelectedCity] = useState<MapCity | null>(null);
  const [storyNodeId, setStoryNodeId] = useState("start");
  const [storyPath, setStoryPath] = useState<string[]>([]);

  function handleQuizAnswer(traitScores: Record<string, number>) {
    const updated = { ...traits };
    for (const [key, val] of Object.entries(traitScores)) {
      updated[key] = (updated[key] || 0) + val;
    }
    setTraits(updated);

    if (quizStep + 1 >= QUIZ_QUESTIONS.length) {
      setMatchedDest(matchDestination(updated));
      setMode("quiz-result");
    } else {
      setQuizStep(quizStep + 1);
    }
  }

  function startQuiz() {
    setQuizStep(0);
    setTraits({});
    setMatchedDest(null);
    setMode("quiz");
  }

  function openStory(city: MapCity) {
    setSelectedCity(city);
    setStoryNodeId("start");
    setStoryPath([]);
    setMode("story");
  }

  function advanceStory(nextId: string) {
    setStoryPath((p) => [...p, storyNodeId]);
    setStoryNodeId(nextId);
  }

  const currentQuestion = QUIZ_QUESTIONS[quizStep];
  const story = selectedCity ? STORIES[selectedCity.storyId] : null;
  const currentNode: StoryNode | null = story ? story.nodes[storyNodeId] : null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[88px]">
        {/* Hero banner */}
        <section className="relative overflow-hidden bg-[#1a0a12] py-16">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1f0d16] to-[#0d060a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,oklch(0.40_0.14_340/0.12),transparent)]" />
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <Compass className="mx-auto h-10 w-10 text-[#FFB3D0]/60 mb-3" />
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Travel{" "}
              <span className="bg-gradient-to-r from-[#FFB3D0] via-[#E8458B] to-[#D4A56A] bg-clip-text text-transparent">
                Playground
              </span>
            </h1>
            <p className="mt-3 text-white/40 text-sm">
              Take the quiz, explore the map, or live an adventure — your choice, amiga!
            </p>
          </div>
        </section>

        <div className="relative bg-[#0d060a] min-h-[70vh]">
          <div className="absolute inset-0 pattern-grid opacity-5" />

          <AnimatePresence mode="wait">
            {/* === MAIN MENU === */}
            {mode === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative mx-auto max-w-4xl px-4 py-16"
              >
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {[
                    {
                      icon: HelpCircle,
                      title: "Travel Quiz",
                      desc: "Answer 7 questions and we'll match you with your dream destination",
                      emoji: "✨",
                      gradient: "from-[#E8458B] to-[#D4357A]",
                      onClick: startQuiz,
                    },
                    {
                      icon: Globe,
                      title: "World Map",
                      desc: "Explore an interactive map — click any city to start an adventure",
                      emoji: "🗺️",
                      gradient: "from-[#DAA520] to-[#C44B3F]",
                      onClick: () => setMode("map"),
                    },
                    {
                      icon: BookOpen,
                      title: "Quick Adventure",
                      desc: "Jump into a random choose-your-own-adventure story",
                      emoji: "📖",
                      gradient: "from-[#9B2C8A] to-[#E8458B]",
                      onClick: () => {
                        const cities = MAP_CITIES;
                        const random = cities[Math.floor(Math.random() * cities.length)];
                        openStory(random);
                      },
                    },
                  ].map((item) => (
                    <button
                      key={item.title}
                      onClick={item.onClick}
                      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} p-8 text-left text-white transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#E8458B]/20`}
                    >
                      <div className="absolute inset-0 pattern-dots opacity-10" />
                      <div className="relative">
                        <span className="text-4xl block mb-4">{item.emoji}</span>
                        <item.icon className="h-5 w-5 mb-2 text-white/60" />
                        <h3 className="text-xl font-bold font-[family-name:var(--font-heading)]">{item.title}</h3>
                        <p className="mt-2 text-sm text-white/60 leading-relaxed">{item.desc}</p>
                        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-white/80">
                          Play Now <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* === QUIZ === */}
            {mode === "quiz" && currentQuestion && (
              <motion.div
                key={`quiz-${quizStep}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="relative mx-auto max-w-2xl px-4 py-16"
              >
                <div className="text-center mb-8">
                  <div className="flex justify-center gap-1.5 mb-6">
                    {QUIZ_QUESTIONS.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          i === quizStep ? "w-8 bg-[#E8458B]" : i < quizStep ? "w-4 bg-[#E8458B]/40" : "w-4 bg-white/10",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-2">
                    Question {quizStep + 1} of {QUIZ_QUESTIONS.length}
                  </p>
                  <span className="text-5xl block mb-4">{currentQuestion.emoji}</span>
                  <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-heading)]">
                    {currentQuestion.question}
                  </h2>
                </div>

                <div className="space-y-3">
                  {currentQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuizAnswer(opt.traits)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-left text-white transition-all hover:border-[#E8458B]/40 hover:bg-[#E8458B]/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#E8458B]/10 group"
                    >
                      <span className="text-sm font-medium group-hover:text-[#FFB3D0] transition-colors">
                        {opt.text}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* === QUIZ RESULT === */}
            {mode === "quiz-result" && matchedDest && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="relative mx-auto max-w-2xl px-4 py-16 text-center"
              >
                <Sparkles className="mx-auto h-8 w-8 text-[#FFB3D0] mb-3" />
                <p className="text-xs uppercase tracking-[0.3em] text-[#FFB3D0] font-bold mb-2">Your Perfect Match</p>
                <div className={`mx-auto mt-6 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r ${matchedDest.gradient} px-8 py-5 shadow-2xl shadow-[#E8458B]/20`}>
                  <span className="text-5xl">{matchedDest.emoji}</span>
                  <div className="text-left text-white">
                    <h2 className="text-3xl font-bold font-[family-name:var(--font-heading)]">{matchedDest.name}</h2>
                    <p className="text-sm text-white/60">{matchedDest.country}</p>
                  </div>
                </div>

                <p className="mt-8 text-white/70 leading-relaxed max-w-lg mx-auto">{matchedDest.description}</p>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 max-w-lg mx-auto">
                  <p className="text-sm font-semibold text-[#FFB3D0] mb-1">Why this is YOUR destination:</p>
                  <p className="text-sm text-white/60 leading-relaxed">{matchedDest.whyYou}</p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {matchedDest.tripLink && (
                    <Link
                      href={matchedDest.tripLink}
                      className={cn(buttonVariants(), "bg-gradient-to-r from-[#E8458B] to-[#D4357A] text-white border-0 hover:brightness-110 gap-2 px-6")}
                    >
                      <Sparkles className="h-4 w-4" /> Book This Trip
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    onClick={startQuiz}
                    className="border-white/15 text-white/60 hover:text-white hover:bg-white/5 gap-2"
                  >
                    <RotateCcw className="h-4 w-4" /> Retake Quiz
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const city = MAP_CITIES.find((c) => c.id === matchedDest.id);
                      if (city) openStory(city);
                      else setMode("map");
                    }}
                    className="border-white/15 text-white/60 hover:text-white hover:bg-white/5 gap-2"
                  >
                    <BookOpen className="h-4 w-4" /> Play the Adventure
                  </Button>
                </div>

                <button
                  onClick={() => setMode("menu")}
                  className="mt-6 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  ← Back to menu
                </button>
              </motion.div>
            )}

            {/* === WORLD MAP === */}
            {mode === "map" && (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative mx-auto max-w-5xl px-4 py-10"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-white font-[family-name:var(--font-heading)]">
                    <Map className="inline h-5 w-5 mr-2 text-[#FFB3D0]" />
                    Click a city to start your adventure
                  </h2>
                  <button onClick={() => setMode("menu")} className="mt-2 text-xs text-white/30 hover:text-white/60">
                    ← Back to menu
                  </button>
                </div>

                {/* SVG World Map */}
                <div className="relative aspect-[2/1] rounded-2xl border border-white/10 bg-[#0a0408] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,oklch(0.20_0.05_340/0.15),transparent)]" />

                  {/* Simplified continent shapes */}
                  <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    {/* North America */}
                    <path d="M10,8 L28,8 L30,12 L28,18 L25,22 L22,25 L18,22 L15,18 L10,15 Z" fill="white" opacity="0.06" />
                    {/* Central America */}
                    <path d="M18,22 L22,25 L23,28 L21,30 L18,28 Z" fill="white" opacity="0.06" />
                    {/* South America */}
                    <path d="M22,28 L28,28 L30,35 L28,42 L24,45 L20,42 L19,35 Z" fill="white" opacity="0.06" />
                    {/* Europe */}
                    <path d="M42,8 L55,8 L56,14 L52,18 L48,16 L44,14 L42,10 Z" fill="white" opacity="0.06" />
                    {/* Africa */}
                    <path d="M44,18 L56,18 L58,25 L56,35 L52,40 L48,38 L44,30 L43,22 Z" fill="white" opacity="0.06" />
                    {/* Asia */}
                    <path d="M56,6 L85,6 L88,15 L85,22 L78,25 L70,22 L65,18 L58,14 Z" fill="white" opacity="0.06" />
                    {/* Southeast Asia / Indonesia */}
                    <path d="M72,25 L82,28 L85,32 L80,34 L75,32 L72,28 Z" fill="white" opacity="0.06" />
                    {/* Australia */}
                    <path d="M78,35 L88,35 L90,40 L86,44 L80,42 Z" fill="white" opacity="0.06" />
                    {/* Grid lines */}
                    {[10, 20, 30, 40].map((y) => (
                      <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="white" strokeWidth="0.1" opacity="0.05" />
                    ))}
                    {[20, 40, 60, 80].map((x) => (
                      <line key={`v${x}`} x1={x} y1="0" x2={x} y2="50" stroke="white" strokeWidth="0.1" opacity="0.05" />
                    ))}
                  </svg>

                  {/* City pins */}
                  {MAP_CITIES.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => openStory(city)}
                      className="absolute group"
                      style={{
                        left: `${city.x}%`,
                        top: `${city.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {/* Ping animation */}
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="absolute h-6 w-6 rounded-full bg-[#E8458B] opacity-20 animate-ping" />
                      </span>
                      {/* Pin dot */}
                      <span className="relative flex h-4 w-4 items-center justify-center">
                        <span className={`h-3 w-3 rounded-full bg-gradient-to-br ${city.gradient} shadow-lg shadow-[#E8458B]/30 transition-transform group-hover:scale-150`} />
                      </span>
                      {/* Label */}
                      <span className="absolute left-1/2 -translate-x-1/2 top-5 whitespace-nowrap rounded-md bg-black/80 px-2 py-0.5 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-white/10">
                        {city.emoji} {city.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* City list below map */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MAP_CITIES.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => openStory(city)}
                      className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left transition-all hover:border-[#E8458B]/30 hover:bg-[#E8458B]/5 group"
                    >
                      <span className="text-2xl">{city.emoji}</span>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-[#FFB3D0] transition-colors">{city.name}</p>
                        <p className="text-[10px] text-white/30">{city.country}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* === STORY / ADVENTURE === */}
            {mode === "story" && story && currentNode && (
              <motion.div
                key={`story-${storyNodeId}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="relative mx-auto max-w-2xl px-4 py-16"
              >
                {/* Story header */}
                <div className="text-center mb-2">
                  <Badge className={`bg-gradient-to-r ${selectedCity?.gradient} text-white border-0 px-3 py-1 text-xs font-bold`}>
                    {selectedCity?.emoji} {selectedCity?.name} Adventure
                  </Badge>
                </div>

                {/* Story intro (only on first node) */}
                {storyNodeId === "start" && story.intro && (
                  <p className="text-center text-sm text-white/40 italic mb-6 max-w-lg mx-auto">
                    {story.intro}
                  </p>
                )}

                {/* Current node */}
                {currentNode.ending ? (
                  /* === ENDING === */
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      className="text-7xl mb-4"
                    >
                      {currentNode.ending.emoji}
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white font-[family-name:var(--font-heading)]">
                      {currentNode.ending.title}
                    </h2>
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-6 max-w-lg mx-auto">
                      <p className="text-white/60 leading-relaxed">
                        {currentNode.ending.description}
                      </p>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button
                        onClick={() => { setStoryNodeId("start"); setStoryPath([]); }}
                        className="bg-gradient-to-r from-[#E8458B] to-[#D4357A] text-white border-0 hover:brightness-110 gap-2"
                      >
                        <RotateCcw className="h-4 w-4" /> Replay
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMode("map")}
                        className="border-white/15 text-white/60 hover:text-white hover:bg-white/5 gap-2"
                      >
                        <Map className="h-4 w-4" /> Try Another City
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMode("menu")}
                        className="border-white/15 text-white/60 hover:text-white hover:bg-white/5"
                      >
                        Menu
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* === STORY NODE === */
                  <div>
                    <div className="text-center mb-8">
                      <span className="text-5xl block mb-4">{currentNode.emoji}</span>
                      <p className="text-white/80 leading-relaxed max-w-lg mx-auto text-lg">
                        {currentNode.text}
                      </p>
                    </div>

                    {currentNode.choices && (
                      <div className="space-y-3 max-w-lg mx-auto">
                        {currentNode.choices.map((choice, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.1 }}
                            onClick={() => advanceStory(choice.nextId)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-left text-white transition-all hover:border-[#E8458B]/40 hover:bg-[#E8458B]/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#E8458B]/10 group"
                          >
                            <span className="flex items-center justify-between">
                              <span className="text-sm font-medium group-hover:text-[#FFB3D0] transition-colors">
                                {choice.text}
                              </span>
                              <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-[#FFB3D0] transition-colors" />
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* Path breadcrumb */}
                    {storyPath.length > 0 && (
                      <div className="mt-8 text-center">
                        <button
                          onClick={() => {
                            const prev = storyPath[storyPath.length - 1];
                            setStoryPath((p) => p.slice(0, -1));
                            setStoryNodeId(prev);
                          }}
                          className="text-xs text-white/20 hover:text-white/50 transition-colors"
                        >
                          ← Go back
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </>
  );
}
