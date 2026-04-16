"use client";

const WORDS = [
  "connect",
  "empower",
  "celebrate",
  "amigas y más social",
  "sisterhood",
  "travel",
  "memories",
  "growth",
  "family",
  "cultura",
  "aventura",
  "hermandad",
];

export function Marquee() {
  const track = WORDS.map((w) => (
    <span key={w} className="flex items-center gap-6">
      <span className="text-sm sm:text-base font-bold uppercase tracking-[0.2em]">{w}</span>
      <span className="text-primary text-lg">♡</span>
    </span>
  ));

  return (
    <div className="relative overflow-hidden border-y border-rosa/20 bg-gradient-to-r from-rosa/8 via-primary/5 to-rosa/8 py-4">
      <div className="flex w-max animate-[marquee_30s_linear_infinite] gap-6">
        {track}
        {track}
      </div>
    </div>
  );
}
