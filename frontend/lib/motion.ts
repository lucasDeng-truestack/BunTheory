import type { Variants } from "motion/react";

/**
 * Shared motion vocabulary for the storefront. All animations are transform +
 * opacity only (GPU-cheap, no layout thrash) and are gated behind
 * `useReducedMotion` at the component level so they collapse to instant motion
 * for users who ask for it. Keep durations calm and premium — nothing bouncy.
 */

/** Confident, decelerating ease — the house curve. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** Reveal once, a touch before the element is fully on-screen. */
export const viewportOnce = { once: true, margin: "0px 0px -80px 0px" } as const;

/** Single element rising into place. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

/** Parent that orchestrates a staggered reveal of its `fadeUpItem` children. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

/** Child of `staggerContainer`. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

/** Hero focal reveal — slightly larger travel + soft scale settle. */
export const heroReveal: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

/** Enters from the left (for right-/center-aligned content). */
export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: EASE_OUT } },
};

/** Enters from the right. */
export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: EASE_OUT } },
};

/** Settles in with a soft scale — good for cards / focal panels. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
};

/** Vertical clip-wipe — reads like an image developing; used for media blocks. */
export const clipReveal: Variants = {
  hidden: { clipPath: "inset(0 0 100% 0)", scale: 1.05 },
  visible: {
    clipPath: "inset(0 0 0% 0)",
    scale: 1,
    transition: { duration: 0.85, ease: EASE_OUT },
  },
};

export type RevealVariant = "up" | "left" | "right" | "scale" | "clip";

export const revealVariants: Record<RevealVariant, Variants> = {
  up: fadeUp,
  left: fadeLeft,
  right: fadeRight,
  scale: scaleIn,
  clip: clipReveal,
};
