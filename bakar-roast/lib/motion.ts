/**
 * Shared motion language for the whole site. GPU-friendly transforms only
 * (opacity / transform / clip).
 */

export const ease = {
  /** Signature ease-out. Confident, settles softly. */
  out: [0.22, 1, 0.36, 1] as const,
};

/** Design-system easings from motion.md. Entrances use `out`, wipes and panels `inOut`. */
export const expo = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.76, 0, 0.24, 1] as const,
};

export const duration = {
  /** motion.md default: 0.8s on almost everything. */
  default: 0.8,
} as const;

/** True when the visitor asked for reduced motion. For effect code that runs after mount. */
export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fine pointer (mouse or trackpad) and motion allowed: cursor, magnetic, trail effects. */
export const finePointerMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches && !reducedMotion();
