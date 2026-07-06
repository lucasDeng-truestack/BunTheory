"use client";

import { useRef } from "react";
import {
  m,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";

type Tone = "yellow" | "red" | "cream" | "black";

const toneClass: Record<Tone, string> = {
  yellow: "bg-bun-yellow text-bun-ink border-bun-ink",
  red: "bg-bun-red text-white border-bun-ink",
  cream: "bg-bun-cream-soft text-bun-ink border-bun-ink",
  black: "bg-bun-black text-bun-cream border-bun-black",
};

/** Lifted-off-the-surface shadow (soft, floating) → stuck-flat shadow (hard offset). */
const LIFTED_SHADOW = "22px 30px 26px rgba(23,18,14,0.34)";
const STUCK_SHADOW = "4px 4px 0px rgba(23,18,14,1)";

type PeelOnStickerProps = {
  children: React.ReactNode;
  className?: string;
  tone?: Tone;
  /** Resting tilt once fully "stuck" (degrees). */
  rotate?: number;
  /**
   * What drives the peel:
   * - `scroll` (default): tied to scroll progress — best for section images
   *   below the fold that reveal as you scroll toward them.
   * - `mount`: springs down on its own when it enters view — best for
   *   above-the-fold hero badges that are already visible on load.
   */
  trigger?: "scroll" | "mount";
  /** Stagger the mount peel (seconds). Only used with `trigger="mount"`. */
  delay?: number;
};

/**
 * "Peel-on" sticker: starts lifted + tilted off the surface with a soft floating
 * shadow, then settles flat and sticks (hard offset shadow). Reduced-motion →
 * static sticker.
 */
export function PeelOnSticker({
  children,
  className,
  tone = "yellow",
  rotate = -8,
  trigger = "scroll",
  delay = 0,
}: PeelOnStickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  // Bigger travel + tilt so the sticker visibly peels off the surface before
  // it slaps down flat and sticks. transformOrigin stays pinned top-right so
  // the corner acts as the hinge.
  const r = useTransform(scrollYProgress, [0, 1], [rotate - 46, rotate]);
  const y = useTransform(scrollYProgress, [0, 1], [-46, 0]);
  const x = useTransform(scrollYProgress, [0, 1], [10, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.32, 1]);
  const boxShadow = useTransform(scrollYProgress, [0, 1], [LIFTED_SHADOW, STUCK_SHADOW]);

  const base =
    "inline-flex select-none items-center justify-center rounded-full border-2 px-4 py-2 text-center font-display text-sm font-semibold uppercase leading-none tracking-wide";

  if (reduce) {
    return (
      <span
        className={cn(base, "shadow-sticker", toneClass[tone], className)}
        style={{ rotate: `${rotate}deg` }}
      >
        {children}
      </span>
    );
  }

  if (trigger === "mount") {
    const variants: Variants = {
      lifted: { rotate: rotate - 46, x: 10, y: -46, scale: 1.32, boxShadow: LIFTED_SHADOW },
      stuck: {
        rotate,
        x: 0,
        y: 0,
        scale: 1,
        boxShadow: STUCK_SHADOW,
        transition: {
          type: "spring",
          damping: 11,
          stiffness: 240,
          mass: 0.9,
          delay,
          // A plain fade on the shadow avoids a springy blur wobble.
          boxShadow: { type: "tween", duration: 0.45, ease: "easeOut", delay },
        },
      },
    };

    return (
      <m.span
        ref={ref}
        className={cn(base, toneClass[tone], className)}
        style={{ transformOrigin: "top right" }}
        variants={variants}
        initial="lifted"
        whileInView="stuck"
        viewport={{ once: false, margin: "0px 0px -12% 0px" }}
      >
        {children}
      </m.span>
    );
  }

  return (
    <m.span
      ref={ref}
      className={cn(base, toneClass[tone], className)}
      style={{ rotate: r, x, y, scale, boxShadow, transformOrigin: "top right" }}
    >
      {children}
    </m.span>
  );
}
