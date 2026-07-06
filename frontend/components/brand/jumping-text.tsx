"use client";

import { m, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

type JumpingTextProps = {
  /** The text to animate letter-by-letter. */
  text: string;
  className?: string;
  /** Lead-in before the first letter jumps (seconds). */
  delay?: number;
  /** Per-letter stagger (seconds). */
  stagger?: number;
  /** Replay every time it scrolls into view instead of only on mount. */
  replayInView?: boolean;
};

const letter: Variants = {
  hidden: { y: "115%", opacity: 0, rotate: -6, scale: 0.9 },
  visible: {
    y: 0,
    opacity: 1,
    rotate: 0,
    scale: 1,
    // Snappy, controlled landing: stiff spring + higher damping keeps the
    // overshoot to a single crisp tick instead of a loose wobble.
    transition: { type: "spring", damping: 13, stiffness: 480, mass: 0.7 },
  },
};

/**
 * CRAV-style headline entrance: each letter springs up from below with a
 * bouncy overshoot, staggered across the word. Collapses to plain text under
 * reduced-motion. Spaces are preserved as fixed-width gaps.
 */
export function JumpingText({
  text,
  className,
  delay = 0.1,
  stagger = 0.036,
  replayInView = false,
}: JumpingTextProps) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };

  const chars = Array.from(text);

  return (
    <m.span
      aria-label={text}
      className={cn("inline-flex flex-wrap", className)}
      variants={container}
      initial="hidden"
      {...(replayInView
        ? { whileInView: "visible", viewport: { once: false, margin: "0px 0px -20% 0px" } }
        : { animate: "visible" })}
    >
      {chars.map((ch, i) =>
        ch === " " ? (
          <span key={i} aria-hidden className="inline-block w-[0.32em]" />
        ) : (
          <m.span
            key={i}
            aria-hidden
            variants={letter}
            className="inline-block will-change-transform"
            style={{ transformOrigin: "bottom" }}
          >
            {ch}
          </m.span>
        )
      )}
    </m.span>
  );
}
