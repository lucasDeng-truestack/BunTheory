"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { usePrefersReducedMotion, useIsTouch } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Opt-in magnetic pull (motion.md "Buttons"): the child is pulled toward the cursor and snaps
 * back with a springy overshoot on leave. Fine pointers only; off on touch and under reduced
 * motion. Public marketing buttons only, never in booking or admin. Wrap a <Button>.
 */
export function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = usePrefersReducedMotion();
  const touch = useIsTouch();
  const ref = useRef<HTMLSpanElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Low damping gives the springy snap back.
  const spring = { stiffness: 260, damping: 11, mass: 0.6 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  const off = reduce || touch;

  return (
    <motion.span
      ref={ref}
      onPointerMove={(e) => {
        if (off || e.pointerType !== "mouse" || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
        y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ x: sx, y: sy }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.span>
  );
}
