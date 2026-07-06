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

/** Split on spaces; hyphens become their own break-friendly segment (e.g. FIRE- | ROASTED). */
function wrapSegments(text: string): string[] {
  const segments: string[] = [];
  let word = "";

  for (const ch of text) {
    if (ch === " ") {
      if (word) segments.push(word);
      segments.push(" ");
      word = "";
      continue;
    }
    if (ch === "-") {
      word += ch;
      segments.push(word);
      word = "";
      continue;
    }
    word += ch;
  }

  if (word) segments.push(word);
  return segments;
}

function letterVariant(letterIndex: number, delay: number, stagger: number): Variants {
  return {
    hidden: { y: "115%", opacity: 0, rotate: -6, scale: 0.9 },
    visible: {
      y: 0,
      opacity: 1,
      rotate: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 13,
        stiffness: 480,
        mass: 0.7,
        delay: delay + letterIndex * stagger,
      },
    },
  };
}

/**
 * CRAV-style headline entrance: each letter springs up from below with a
 * bouncy overshoot, staggered across the word. Letters never wrap mid-word —
 * only between words (or hyphen segments). Collapses to plain text under
 * reduced-motion.
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

  const segments = wrapSegments(text);
  let letterIndex = 0;

  const motionTrigger = replayInView
    ? ({
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: false, margin: "0px 0px -20% 0px" },
      } as const)
    : ({ initial: "hidden" as const, animate: "visible" as const } as const);

  return (
    <span aria-label={text} className={cn("inline-flex flex-wrap items-baseline", className)}>
      {segments.map((segment, si) => {
        if (segment === " ") {
          return (
            <span key={`space-${si}`} aria-hidden className="inline-block w-[0.32em]" />
          );
        }

        return (
          <span key={`word-${si}-${segment}`} className="inline-flex flex-nowrap">
            {Array.from(segment).map((ch) => {
              const idx = letterIndex++;
              return (
                <m.span
                  key={idx}
                  aria-hidden
                  {...motionTrigger}
                  variants={letterVariant(idx, delay, stagger)}
                  className="inline-block will-change-transform"
                  style={{ transformOrigin: "bottom" }}
                >
                  {ch}
                </m.span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
