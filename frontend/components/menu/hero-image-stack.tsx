"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Static landing hero assets (not from DB). Center = burger; sides peek on a timer. */
export const LANDING_HERO_IMAGES = {
  left: {
    src: "/images/items/grilled%20cheese.png",
    alt: "Grilled cheese sandwich",
  },
  center: {
    src: "/images/items/FriedChickenBurger-removebg-preview.png",
    alt: "Fried chicken burger",
  },
  right: {
    src: "/images/items/vecteezy_loaded-fries-transparent-background_53296599.png",
    alt: "Loaded fries",
  },
} as const;

const CYCLE_MS_DESKTOP = 3000;
/** Slightly slower on narrow viewports — easier to follow, less busy on small screens. */
const CYCLE_MS_COMPACT = 3800;
const EASE = "cubic-bezier(0.34, 1.35, 0.64, 1)";
const TRANSITION_MS_DESKTOP = 780;
const TRANSITION_MS_COMPACT = 820;

const COMPACT_QUERY = "(max-width: 639px)";

/**
 * Center burger on top. Side dishes start stacked at the center (behind the burger),
 * then slide out to their corners every few seconds; reduced motion = static trio.
 * Compact layouts use gentler transforms so sides stay in-frame on phones.
 */
export function HeroImageStack() {
  const { left, center, right } = LANDING_HERO_IMAGES;
  const [peek, setPeek] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const cycle = compact ? CYCLE_MS_COMPACT : CYCLE_MS_DESKTOP;
    const id = window.setInterval(() => setPeek((v) => !v), cycle);
    return () => window.clearInterval(id);
  }, [reducedMotion, compact]);

  const showSides = reducedMotion || peek;

  const transitionMs = compact ? TRANSITION_MS_COMPACT : TRANSITION_MS_DESKTOP;

  /** Hidden: clustered at hero center (under burger); visible: further out — softer on compact. */
  const leftTransform = showSides
    ? compact
      ? "translate(-8%, 1%) rotate(-8deg) scale(1)"
      : "translate(-14%, 2%) rotate(-11deg) scale(1)"
    : compact
      ? "translate(32%, -26%) rotate(-3deg) scale(0.4)"
      : "translate(48%, -30%) rotate(-4deg) scale(0.34)";

  const rightTransform = showSides
    ? compact
      ? "translate(2%, 1%) rotate(7deg) scale(1)"
      : "translate(0, 0) rotate(9deg) scale(1)"
    : compact
      ? "translate(-28%, -18%) rotate(3deg) scale(0.42)"
      : "translate(-38%, -22%) rotate(4deg) scale(0.38)";

  return (
    <div className="relative h-full w-full">
      {/* Back-left — transform-origin at center-bottom so motion reads as “from the middle” */}
      <div
        className={cn(
          "pointer-events-none absolute z-[1] h-[52%] w-[52%] sm:h-[50%] sm:w-[50%]",
          !reducedMotion && !compact && "will-change-transform"
        )}
        style={{
          left: "-12%",
          bottom: "-2%",
          transformOrigin: "55% 78%",
          transition: `transform ${transitionMs}ms ${EASE}, opacity 520ms ease-out`,
          transform: leftTransform,
          opacity: showSides ? 1 : 0,
        }}
      >
        <Image
          src={left.src}
          alt={left.alt}
          fill
          className="object-contain object-bottom drop-shadow-[0_14px_32px_rgba(0,0,0,0.2)]"
          sizes="(max-width: 640px) 42vw, 200px"
        />
      </div>

      {/* Back-right — same idea, mirrored */}
      <div
        className={cn(
          "pointer-events-none absolute z-[1] h-[48%] w-[48%] sm:h-[46%] sm:w-[46%]",
          !reducedMotion && !compact && "will-change-transform"
        )}
        style={{
          right: "-6%",
          top: "0%",
          transformOrigin: "45% 72%",
          transition: `transform ${transitionMs}ms ${EASE} 70ms, opacity 520ms ease-out 50ms`,
          transform: rightTransform,
          opacity: showSides ? 1 : 0,
        }}
      >
        <Image
          src={right.src}
          alt={right.alt}
          fill
          className="object-contain object-top drop-shadow-[0_14px_32px_rgba(0,0,0,0.2)]"
          sizes="(max-width: 640px) 38vw, 180px"
        />
      </div>

      {/* Center — burger */}
      <div
        className={cn(
          "relative z-10 h-full w-full",
          !reducedMotion && "transition-transform duration-700 ease-out",
          showSides && !reducedMotion
            ? compact
              ? "scale-[1.01]"
              : "scale-[1.02]"
            : "scale-100"
        )}
        style={{ transformOrigin: "50% 85%" }}
      >
        <Image
          src={center.src}
          alt={center.alt}
          fill
          className="object-contain object-bottom drop-shadow-[0_22px_55px_rgba(122,12,12,0.22)] lg:object-[30%_100%]"
          sizes="(max-width: 1024px) 100vw, 45vw"
          priority
        />
      </div>
    </div>
  );
}
