"use client";

const WORDS = [
  "connect",
  "empower",
  "celebrate",
  "latina travel",
  "amigas y más social",
  "sisterhood",
  "group trips",
  "latina community",
  "memories",
  "growth",
  "family",
  "cultura",
  "aventura",
  "hermandad",
];

export function Marquee() {
  const track = WORDS.map((w) => (
    <span key={w} className="flex items-center gap-5">
      <span className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.28em] text-[#6A1B4D]">{w}</span>
      <span className="text-[#FF0099] text-base leading-none">♡</span>
    </span>
  ));

  return (
    <div className="relative overflow-hidden border-y border-[#FACDE8]/60 bg-[#FFF7FB] py-3.5">
      {/* Left / right edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#FFF7FB] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#FFF7FB] to-transparent" />
      <div className="flex w-max animate-[marquee_30s_linear_infinite] gap-5">
        {track}
        {track}
      </div>
    </div>
  );
}
