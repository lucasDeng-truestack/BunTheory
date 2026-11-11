"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useSpring } from "motion/react";
import { finePointerMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The calm pages keep the plain pointer.
const OFF = /^\/(admin|catering\/book|booking|account)(\/|$)/;
const SIZE = 88;

/**
 * Cursor (motion.md): a small ember dot follows the pointer and grows into a labelled circle over
 * anything with `data-cursor="View"`. Fine pointers only, after mount; off under reduced motion
 * and on the admin, booking, status and account pages. The native cursor stays. Sits above page
 * content (z-39) but under the phone menu (z-40), header and dialogs; never takes the pointer.
 */
export function Cursor() {
  const pathname = usePathname() ?? "/";
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const spring = { stiffness: 500, damping: 40, mass: 0.5 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOn(finePointerMotion());
    update();
    fine.addEventListener("change", update);
    rm.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      rm.removeEventListener("change", update);
    };
  }, []);

  const active = on && !OFF.test(pathname);

  // A new page: the hovered card may be gone without a pointerout.
  useEffect(() => setLabel(null), [pathname]);

  useEffect(() => {
    if (!active) return setShown(false);
    let first = true;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return setShown(false);
      x.set(e.clientX);
      y.set(e.clientY);
      // Appear under the pointer, not sweeping in from the corner.
      if (first) {
        sx.jump(e.clientX);
        sy.jump(e.clientY);
        first = false;
      }
      setShown(true);
    };
    const over = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-cursor]");
      setLabel(el?.getAttribute("data-cursor") || null);
    };
    const leave = () => {
      setShown(false);
      first = true;
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [active, x, y, sx, sy]);

  return (
    <motion.div
      aria-hidden
      style={{ x: sx, y: sy, width: SIZE, height: SIZE, marginLeft: -SIZE / 2, marginTop: -SIZE / 2 }}
      className={cn(
        "pointer-events-none fixed left-0 top-0 z-[39] hidden",
        active && shown && "block",
      )}
    >
      <span
        className={cn(
          "type-eyebrow grid h-full w-full place-items-center rounded-full bg-ember text-ink transition-transform duration-500 ease-expo-out",
          label ? "scale-100" : "scale-[0.14]",
        )}
      >
        <span className={cn("transition-opacity duration-300", label ? "opacity-100" : "opacity-0")}>{label}</span>
      </span>
    </motion.div>
  );
}
