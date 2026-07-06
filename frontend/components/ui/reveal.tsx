"use client";

import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import {
  fadeUpItem,
  heroReveal,
  revealVariants,
  staggerContainer,
  viewportOnce,
  type RevealVariant,
} from "@/lib/motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Optional lead-in delay (seconds). */
  delay?: number;
  /** Use the larger hero reveal instead of the standard fade-up. */
  hero?: boolean;
  /**
   * How the block enters view. Defaults to `up` (fade-up). Use directional
   * (`left`/`right`), `scale`, or `clip` (media wipe) to give the page rhythm
   * instead of one repeated fade.
   */
  variant?: RevealVariant;
};

/**
 * Reveal a block on scroll-into-view (once). Collapses to a plain element when
 * the user prefers reduced motion.
 */
export function Reveal({ children, className, delay, hero, variant = "up" }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      variants={hero ? heroReveal : revealVariants[variant]}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      {...(delay ? { transition: { delay } } : {})}
    >
      {children}
    </m.div>
  );
}

type GroupProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Staggered container: direct {@link RevealItem} children fade up in sequence.
 */
export function RevealGroup({ children, className }: GroupProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </m.div>
  );
}

/** Item inside a {@link RevealGroup}. */
export function RevealItem({ children, className }: GroupProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <m.div className={className} variants={fadeUpItem}>
      {children}
    </m.div>
  );
}
