"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealItem = {
  src: string;
  alt: string;
  /** Relative size multiplier for each revealed item. */
  size?: number;
};

const BAG_IMAGE = {
  src: "/images/items/paper%20bag.png",
  alt: "The Bun Theory takeaway bag",
} as const;

/**
 * Items shown in front when the bag step hides — add entries anytime.
 */
export const HERO_REVEAL_ITEMS: RevealItem[] = [
  {
    src: "/images/items/Burger.png",
    alt: "The Bun Theory Burger",
    size: 1.3,
  },
  {
    src: "/images/items/Fries.png",
    alt: "Loaded Fries",
    size: 1.12,
  },
];

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const COMPACT_PX = 480;
const TOGGLE_DESKTOP_MS = 2600;
const TOGGLE_COMPACT_MS = 3000;
const TRANSITION_DESKTOP_MS = 900;
const TRANSITION_COMPACT_MS = 980;
/** Narrow fan — items stay close, like one order being handed over. */
const ARC_DEG = 7;
const SPREAD_DESKTOP = 3.35;
const SPREAD_COMPACT = 2.95;
const BASE_ITEM_PCT_DESKTOP = 86;
const BASE_ITEM_PCT_COMPACT = 82;
const BAG_SCALE_DESKTOP = 0.98;
const BAG_SCALE_COMPACT = 0.94;

/** Horizontal fan angle per item index */
function spreadAngle(index: number, count: number): number {
  if (count <= 1) return 0;
  const lo = -ARC_DEG;
  const hi = ARC_DEG;
  return lo + ((hi - lo) * index) / (count - 1);
}

/**
 * Closed: deeper in Z, smaller — inside the bag.
 * Open: comes forward with a slight rotateX (tray tilt “toward the guest”) — not a wide fan.
 */
function itemTransform3d(
  angle: number,
  size: number,
  index: number,
  open: boolean,
  compact: boolean,
): { transform: string; opacity: number } {
  const spread = compact ? SPREAD_COMPACT : SPREAD_DESKTOP;
  /** Pull side items a hair toward center so the pair reads as one serving. */
  const towardCenter = index === 0 ? 1.1 : index === 1 ? -1.1 : 0;
  const txPct = -50 + (angle * spread) / size + towardCenter;
  const rotZ = angle * (compact ? 0.28 : 0.34);

  if (!open) {
    return {
      transform: `translate3d(${txPct.toFixed(1)}%, 10%, -90px) rotate(${(
        rotZ * 0.25
      ).toFixed(1)}deg) rotateX(2deg) scale(0.78)`,
      opacity: 0,
    };
  }

  const tyPct = compact ? -5 : -6;
  const zBase = compact ? 44 : 54;
  /** Second item half a step “on the same tray”, not floating away. */
  const zForward = zBase - index * 8;
  const tiltX = compact ? 4.5 : 5.5;

  return {
    transform: `translate3d(${txPct.toFixed(1)}%, ${tyPct}%, ${zForward}px) rotateZ(${rotZ.toFixed(
      1,
    )}deg) rotateX(${tiltX}deg) scale(1)`,
    opacity: 1,
  };
}

export function HeroImageStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < COMPACT_PX);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion || HERO_REVEAL_ITEMS.length === 0) return;

    const ms = compact ? TOGGLE_COMPACT_MS : TOGGLE_DESKTOP_MS;
    const id = window.setInterval(() => setOpen((value) => !value), ms);
    return () => window.clearInterval(id);
  }, [compact, reducedMotion]);

  /** When reduced motion, interval is off — stay on bag only (no rapid hiding). */
  const showItems = open;
  const transitionMs = compact
    ? TRANSITION_COMPACT_MS
    : TRANSITION_DESKTOP_MS;
  const baseItemPct = compact
    ? BASE_ITEM_PCT_COMPACT
    : BASE_ITEM_PCT_DESKTOP;
  const bagScale = compact ? BAG_SCALE_COMPACT : BAG_SCALE_DESKTOP;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      style={{
        perspective: "1000px",
        perspectiveOrigin: "50% 65%",
      }}
    >
      <div
        className="pointer-events-none absolute inset-[14%] -z-10 rounded-[2.75rem] bg-[radial-gradient(ellipse_78%_70%_at_50%_58%,rgba(248,191,112,0.28),rgba(255,237,213,0.126)_50%,transparent_74%)] blur-sm"
        aria-hidden
      />

      {HERO_REVEAL_ITEMS.map((item, index) => {
        const size = item.size ?? 1;
        const angle = spreadAngle(index, HERO_REVEAL_ITEMS.length);
        const pct = baseItemPct * size;
        const { transform, opacity } = itemTransform3d(
          angle,
          size,
          index,
          showItems,
          compact,
        );

        return (
          <div
            key={item.src}
            className={cn(
              "pointer-events-none absolute left-1/2 z-20",
              !reducedMotion && "will-change-transform",
            )}
            style={{
              width: `${pct}%`,
              height: `${pct}%`,
              bottom: "-10%",
              transformOrigin: "50% 92%",
              transition: `transform ${transitionMs}ms ${EASE} ${index * 100}ms, opacity 480ms ease ${index * 80}ms`,
              transform,
              opacity,
            }}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              className="object-contain drop-shadow-[0_20px_36px_rgba(0,0,0,0.2)]"
              sizes={`(max-width: 640px) ${Math.round(52 * size)}vw, ${Math.round(280 * size)}px`}
            />
          </div>
        );
      })}

      {/* Bag only when closed — hidden while food is shown */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 mx-auto h-[92%] w-[82%]",
          !reducedMotion &&
            "transition-[transform,opacity,visibility] duration-700 ease-out",
        )}
        style={{
          transformOrigin: "50% 100%",
          transform: showItems
            ? "translateY(4%) scale(0.94)"
            : `translateY(0) scale(${bagScale.toFixed(3)})`,
          opacity: showItems ? 0 : 1,
          visibility: showItems ? "hidden" : "visible",
          pointerEvents: showItems ? "none" : "auto",
        }}
        aria-hidden={showItems}
      >
        <Image
          src={BAG_IMAGE.src}
          alt={BAG_IMAGE.alt}
          fill
          className="object-contain object-bottom drop-shadow-[0_24px_55px_rgba(122,12,12,0.18)]"
          sizes="(max-width: 640px) 68vw, 400px"
          priority
        />
      </div>
    </div>
  );
}
