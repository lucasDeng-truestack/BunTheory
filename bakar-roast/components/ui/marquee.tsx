"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/** Base speed in % of one track half per second (about 22s per loop, as in the design). */
const BASE_SPEED = 2.3;

function Ribbon({
  words,
  tone,
  direction,
  factor,
  rotate,
  reduce,
}: {
  words: string[];
  tone: "ember" | "cream";
  direction: 1 | -1;
  factor: MotionValue<number>;
  rotate: MotionValue<number>;
  reduce: boolean;
}) {
  const x = useMotionValue(0);
  const sign = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const f = factor.get();
    // Scrolling up flips the loop; scrolling down restores it.
    if (f < -0.05) sign.current = -1;
    else if (f > 0.05) sign.current = 1;
    const move = direction * sign.current * BASE_SPEED * (1 + Math.abs(f)) * (delta / 1000);
    // Wrap within one half of the doubled track: [-50%, 0%).
    let next = x.get() - move;
    if (next <= -50) next += 50;
    if (next > 0) next -= 50;
    x.set(next);
  });

  const translate = useTransform(x, (v) => `${v}%`);
  const half = Array.from({ length: 4 }, () => words).flat();

  return (
    <motion.div
      aria-hidden
      style={{ rotate }}
      className={cn(
        "absolute -left-[5%] top-1/2 -mt-7 flex h-14 w-[110%] items-center overflow-hidden whitespace-nowrap text-ink",
        "font-display text-[28px] font-extrabold uppercase tracking-[-0.01em] [font-stretch:80%]",
        // Reduced motion: still, at the fixed 3 degree tilt (CSS, so hydration sees one tree).
        tone === "ember" ? "bg-ember motion-reduce:![transform:rotate(-3deg)]" : "bg-cream motion-reduce:![transform:rotate(3deg)]",
      )}
    >
      <motion.div style={{ x: translate }} className="flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex gap-7 pr-7">
            {half.map((w, i) => (
              <span key={i} className="inline-flex items-center gap-7">
                {w}
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-current" />
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/**
 * Two crossed, tilted ribbons of looping words (ember and cream, ink text). Once per page,
 * between the hero and the intro, full width (it bleeds past the page edges).
 * Loops forever, speeds up with scroll speed, reverses with scroll direction, and the ribbons
 * change tilt as you pass. Static under reduced motion. Public pages only.
 */
export function Marquee({
  words = ["Wood fire", "Apple-wood smoke", "Cooked fresh", "Served warm"],
  className,
}: {
  words?: string[];
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY, scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [-1000, 0, 1000], [-4, 0, 4], { clamp: false });
  const tiltCream = useTransform(scrollYProgress, [0, 1], [4.5, 1.5]);
  const tiltEmber = useTransform(scrollYProgress, [0, 1], [-4.5, -1.5]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={words.join(". ") + "."}
      className={cn("relative h-[180px] overflow-hidden", className)}
    >
      <Ribbon words={words} tone="cream" direction={-1} factor={factor} rotate={tiltCream} reduce={reduce} />
      <Ribbon words={words} tone="ember" direction={1} factor={factor} rotate={tiltEmber} reduce={reduce} />
    </div>
  );
}
