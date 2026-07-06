"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

/* ────────────────────────────────────────────────────────────────────────
 * "Ingredient flies up" — CRAV-style add-to-cart animation. When an item is
 * added, a clone of its image launches from the tapped button, arcs upward,
 * and lands on the cart target, which then bumps. One provider owns the flying
 * layer + the registered cart target so any card / the modal can trigger it.
 * Purely visual; the actual cart mutation happens in the caller.
 * ──────────────────────────────────────────────────────────────────────── */

import { DEFAULT_ITEM_IMAGE } from "@/lib/storefront-display";
const FLY_SIZE = 72;

type Flyer = {
  id: number;
  src: string;
  startX: number;
  startY: number;
  peakX: number;
  peakY: number;
  endX: number;
  endY: number;
};

type FlyToCartValue = {
  /** Ref callback for the cart target (badge/button) the flyer lands on. */
  registerTarget: (el: HTMLElement | null) => void;
  /** Launch a flyer from a source rect toward the cart target. */
  fly: (opts: { src?: string | null; from: DOMRect }) => void;
};

const FlyToCartContext = createContext<FlyToCartValue>({
  registerTarget: () => {},
  fly: () => {},
});

export function useFlyToCart(): FlyToCartValue {
  return useContext(FlyToCartContext);
}

function bump(el: HTMLElement | null) {
  el?.animate?.(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.28)" },
      { transform: "scale(0.94)" },
      { transform: "scale(1)" },
    ],
    { duration: 380, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
  );
}

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const targetRef = useRef<HTMLElement | null>(null);
  const idRef = useRef(0);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const reduce = useReducedMotion();

  const registerTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);

  const fly = useCallback(
    ({ src, from }: { src?: string | null; from: DOMRect }) => {
      const targetEl = targetRef.current;
      const target = targetEl?.getBoundingClientRect();
      // No target (or reduced motion) → just bump the badge, skip the flight.
      if (!target || reduce) {
        bump(targetEl);
        return;
      }
      const startX = from.left + from.width / 2;
      const startY = from.top + from.height / 2;
      const endX = target.left + target.width / 2;
      const endY = target.top + target.height / 2;
      const id = ++idRef.current;
      setFlyers((list) => [
        ...list,
        {
          id,
          src: src || DEFAULT_ITEM_IMAGE,
          startX,
          startY,
          // Arc peak: between the two points, lifted well above both.
          peakX: (startX + endX) / 2,
          peakY: Math.min(startY, endY) - 140,
          endX,
          endY,
        },
      ]);
    },
    [reduce]
  );

  const remove = useCallback(
    (id: number) => setFlyers((list) => list.filter((f) => f.id !== id)),
    []
  );

  const off = FLY_SIZE / 2;

  return (
    <FlyToCartContext.Provider value={{ registerTarget, fly }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden>
        <AnimatePresence>
          {flyers.map((f) => (
            <m.img
              key={f.id}
              src={f.src}
              alt=""
              className="fixed left-0 top-0 rounded-2xl border-2 border-bun-ink bg-white object-contain p-1 shadow-sticker"
              style={{ width: FLY_SIZE, height: FLY_SIZE }}
              initial={{ x: f.startX - off, y: f.startY - off, scale: 1, opacity: 1, rotate: 0 }}
              animate={{
                x: [f.startX - off, f.peakX - off, f.endX - off],
                y: [f.startY - off, f.peakY - off, f.endY - off],
                scale: [1, 1.05, 0.25],
                opacity: [1, 1, 0.3],
                rotate: [0, -18, 36],
              }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], times: [0, 0.55, 1] }}
              onAnimationComplete={() => {
                bump(targetRef.current);
                remove(f.id);
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </FlyToCartContext.Provider>
  );
}
