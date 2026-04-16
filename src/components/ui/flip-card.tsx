"use client";

import { cn } from "@/lib/utils";

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export function FlipCard({ front, back, className, innerClassName }: FlipCardProps) {
  return (
    <div className={cn("group [perspective:1200px]", className)}>
      <div
        className={cn(
          "flip-card-inner relative h-full w-full [transform-style:preserve-3d]",
          innerClassName,
        )}
      >
        {/* Front face */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          {front}
        </div>
        {/* Back face */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>

        {/* Sparkle burst — CSS-driven particles that fly outward on hover */}
        <div className="pointer-events-none absolute inset-0 z-30">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="sparkle-particle absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-white"
              style={{ ["--i" as string]: i }}
            />
          ))}
        </div>

        {/* Glow flash on flip */}
        <div className="flip-glow pointer-events-none absolute inset-0 z-20 rounded-2xl" />
      </div>
    </div>
  );
}
