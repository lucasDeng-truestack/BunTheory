"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { ease } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/**
 * Counts from 0 to `value` once, the first time `ref` scrolls into view.
 * Under reduced motion it returns the final value straight away.
 */
export function useCountUp(value: number, { duration = 1.6 }: { duration?: number } = {}) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  // Always 0 on the first render so server and client markup match.
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    const controls = animate(0, value, { duration, ease: ease.out, onUpdate: setDisplay });
    return () => controls.stop();
  }, [inView, reduce, value, duration]);

  return { ref, display };
}

export const formatStat = (n: number, decimals = 0, group = true) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: group,
  });

/**
 * Big display number + small ember superscript unit + label. Only real figures from the owner;
 * drop a stat when the figure is not known. Use `group={false}` for years ("2020").
 * Lay four in a row on desktop, two by two on phone.
 */
export function Stat({
  value,
  unit,
  label,
  decimals = 0,
  group = true,
  className,
}: {
  value: number;
  unit?: string;
  label: string;
  decimals?: number;
  group?: boolean;
  className?: string;
}) {
  const { ref, display } = useCountUp(value);
  const final = formatStat(value, decimals, group);
  return (
    <div ref={ref} className={className}>
      <p className="sr-only">
        {final}
        {unit ? ` ${unit}` : ""} {label}
      </p>
      <div
        aria-hidden
        className="font-display text-[clamp(64px,9vw,128px)] font-extrabold uppercase leading-[0.84] tracking-[-0.025em] [font-stretch:80%]"
      >
        <span className="tabular-nums">{formatStat(display, decimals, group)}</span>
        {unit && (
          <sup className="static ml-1 align-top leading-none text-[0.3em] normal-case tracking-normal text-tone-accent">{unit}</sup>
        )}
      </div>
      <p aria-hidden className={cn("mb-0 mt-3 text-[15px] text-tone-muted")}>
        {label}
      </p>
    </div>
  );
}
