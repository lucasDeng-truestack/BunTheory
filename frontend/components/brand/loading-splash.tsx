"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND_TITLE_LINE, BRAND_SUBLINE } from "@/lib/brand";

/** Layout effect on the client (runs before paint), plain effect on the server. */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type LoadingSplashProps = {
  /** How long the splash holds before it lifts (ms). */
  duration?: number;
  /** Skip entirely (e.g. reduced-motion or already-seen this session). */
  disabled?: boolean;
};

/**
 * CRAV-style branded load splash: a bold cream panel with the mark + wordmark
 * that pops in, holds briefly, then curtain-lifts to reveal the page. Shown
 * once per session on the marketing storefront. Purely decorative — content
 * below renders immediately underneath, so it never blocks interactivity.
 */
export function LoadingSplash({ duration = 1400, disabled = false }: LoadingSplashProps) {
  const [visible, setVisible] = useState(!disabled);

  // Runs before the browser paints, so a returning visitor (splash already
  // seen this session) never sees a flash of the overlay.
  useIsoLayoutEffect(() => {
    if (disabled) return;
    const seen = window.sessionStorage.getItem("bt_splash_seen");
    if (seen) {
      setVisible(false);
      return;
    }
    window.sessionStorage.setItem("bt_splash_seen", "1");
    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const t = window.setTimeout(
      () => setVisible(false),
      prefersReduced ? 300 : duration
    );
    return () => window.clearTimeout(t);
  }, [disabled, duration]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="splash"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bun-cream"
          initial={{ opacity: 1 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          aria-hidden
        >
          <div className="animate-splash-pop flex flex-col items-center gap-4">
            <div className="rounded-3xl border-2 border-bun-ink bg-white p-4 shadow-sticker-lg">
              <BrandLogo size="xl" priority />
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight text-bun-red text-shadow-pop-red">
                {BRAND_TITLE_LINE}
              </p>
              <p className="mt-1 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-ink-soft">
                {BRAND_SUBLINE}
              </p>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
