"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * App-wide motion features (LazyMotion + domAnimation ≈ small bundle: animations,
 * variants, AnimatePresence and hover/tap/focus/inView gestures — no drag/layout).
 * `strict` forbids the heavy `motion.*` components; use `m.*` everywhere instead.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
