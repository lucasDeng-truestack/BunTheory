"use client";

import { useEffect, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  BatchOrderButton,
  deriveBatchDisplay,
  useBatchStatus,
} from "@/components/storefront/batch-status";

/**
 * Phone-only sticky ordering bar. This is a mobile-specific layout decision —
 * not a shrunk desktop element: on a phone the primary action lives in the
 * thumb zone and follows the batch state, appearing only after the hero (whose
 * CTA is already on screen) has scrolled away. Hidden entirely on `lg+`, where
 * the persistent nav + hero CTA already cover this.
 */
export function MobileOrderBar() {
  const ctx = useBatchStatus();
  const d = deriveBatchDisplay(ctx);
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const open = d.isOpen;

  return (
    <m.div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t-2 border-bun-ink/10 bg-bun-cream-soft/95 px-4 pt-3 backdrop-blur lg:hidden",
        !shown && "pointer-events-none"
      )}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      initial={false}
      animate={reduce ? undefined : { y: shown ? 0 : 130 }}
      aria-hidden={!shown}
    >
      <div className="mx-auto flex max-w-md flex-col gap-2">
        <div className="flex items-center justify-center gap-2">
          <span
            className={cn(
              "relative flex h-2 w-2 shrink-0",
              !open && "opacity-0"
            )}
            aria-hidden
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bun-red opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-bun-red" />
          </span>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-bun-ink">
            {d.eyebrow}
            {open && d.orderBy ? ` · closes ${d.orderBy}` : ""}
          </p>
        </div>
        <BatchOrderButton size="lg" className="w-full" />
      </div>
    </m.div>
  );
}
