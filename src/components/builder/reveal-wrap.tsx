"use client";

import { motion } from "framer-motion";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

export type RevealAnimation = "none" | "fade-up" | "fade-in" | "slide-left" | "slide-right";

function initialState(anim: string): { opacity: number; y?: number; x?: number } {
  switch (anim) {
    case "fade-up":
      return { opacity: 0, y: 28 };
    case "fade-in":
      return { opacity: 0 };
    case "slide-left":
      return { opacity: 0, x: 48 };
    case "slide-right":
      return { opacity: 0, x: -48 };
    default:
      return { opacity: 1, y: 0, x: 0 };
  }
}

interface Props {
  p: Record<string, unknown>;
  editable?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent) => void;
  children: ReactNode;
}

export function RevealWrap({ p, editable, className, style, onClick, children }: Props) {
  const anim = ((p.revealAnimation as string) || "none") as RevealAnimation;
  const delaySec = (Number(p.revealDelay) || 0) / 1000;

  if (editable || anim === "none") {
    return (
      <div className={className} style={style} onClick={onClick}>
        {children}
      </div>
    );
  }

  const init = initialState(anim);
  return (
    <motion.div
      className={className}
      style={style}
      onClick={onClick}
      initial={init}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.55, delay: delaySec, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
