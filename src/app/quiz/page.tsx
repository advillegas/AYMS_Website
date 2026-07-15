"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { TravelQuiz } from "@/components/quiz/travel-quiz";

export default function QuizPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <TravelQuiz />
      </main>
      <Footer />
    </div>
  );
}
