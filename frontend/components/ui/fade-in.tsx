"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms */
  delay?: number;
}

/** Narrow viewports: smaller nudge + looser bottom margin so sections reveal while still on-screen. */
const MOBILE_MAX = "(max-width: 639px)";

export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [motion, setMotion] = useState({
    translateY: 18,
    durationMs: 550,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const narrow = window.matchMedia(MOBILE_MAX).matches;
    setMotion(
      narrow
        ? { translateY: 14, durationMs: 520 }
        : { translateY: 20, durationMs: 560 }
    );

    const rootMargin = narrow
      ? "0px 0px -24px 0px"
      : "0px 0px -36px 0px";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0)"
          : `translateY(${motion.translateY}px)`,
        transition: `opacity ${motion.durationMs}ms ease ${delay}ms, transform ${motion.durationMs}ms ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
