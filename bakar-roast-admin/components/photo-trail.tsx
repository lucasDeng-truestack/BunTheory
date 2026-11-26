"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate } from "motion/react";
import { expo, finePointerMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const GAP = 90; // px of pointer travel between drops
const CAP = 8; // tiles alive at once
const W = 120;
const H = 150;

/**
 * Hover photo trail (motion.md): moving the mouse across the wrapped section drops small tilted
 * gradient photo tiles along the path that fade and fall, then are removed. Behind the content,
 * pointer-events-none, so clicks and text selection pass through. Fine pointers only, off under
 * reduced motion (checked per move, after mount). One section per page at most.
 */
export function PhotoTrail({ children, className }: { children: ReactNode; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = host.current;
    const tiles = layer.current;
    if (!box || !tiles) return;
    const live = new Set<{ stop: () => void }>();
    let last: { x: number; y: number } | null = null;
    let n = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || live.size >= CAP || !finePointerMotion()) return;
      if (last && Math.hypot(e.pageX - last.x, e.pageY - last.y) < GAP) return;
      last = { x: e.pageX, y: e.pageY };
      const r = box.getBoundingClientRect();
      const tilt = (n++ % 2 ? 1 : -1) * (6 + Math.random() * 8);
      const tile = document.createElement("div");
      tile.className = cn("absolute rounded-card-sm", n % 3 ? "photo-gradient" : "cta-gradient");
      Object.assign(tile.style, {
        left: `${e.clientX - r.left - W / 2}px`,
        top: `${e.clientY - r.top - H / 2}px`,
        width: `${W}px`,
        height: `${H}px`,
        opacity: "0",
      });
      tiles.appendChild(tile);
      const run = animate(
        tile,
        {
          opacity: [0, 0.9, 0],
          transform: [`rotate(${tilt}deg) scale(0.6)`, `rotate(${tilt}deg) scale(1)`, `translateY(140px) rotate(${tilt * 1.6}deg) scale(0.9)`],
        },
        { duration: 1.2, ease: expo.out, times: [0, 0.2, 1] },
      );
      live.add(run);
      run.then(() => {
        live.delete(run);
        tile.remove();
      });
    };
    const onLeave = () => (last = null);

    box.addEventListener("pointermove", onMove, { passive: true });
    box.addEventListener("pointerleave", onLeave);
    return () => {
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerleave", onLeave);
      live.forEach((run) => run.stop());
      live.clear();
      tiles.replaceChildren();
    };
  }, []);

  return (
    <div ref={host} className={cn("relative isolate", className)}>
      <div ref={layer} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" />
      {children}
    </div>
  );
}
