"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingBreadcrumb } from "@/components/ui/animated-loading-svg-text-shimmer";

const MIN_MS = 2000;
/** If navigation never completes, clear the overlay so the UI cannot stay stuck. */
const SAFETY_MS = 15000;

function isModifiedClick(e: MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/**
 * Shows the route loading overlay on in-app navigation and keeps it visible for
 * at least {@link MIN_MS} from when the navigation started, then hides it.
 */
export function NavigationLoadingGate() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const navStartRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current != null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const clearSafetyTimeout = useCallback(() => {
    if (safetyTimeoutRef.current != null) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  const scheduleHideFromStart = useCallback(() => {
    clearHideTimeout();
    clearSafetyTimeout();
    const start = navStartRef.current;
    if (start == null) return;
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, MIN_MS - elapsed);
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      navStartRef.current = null;
      hideTimeoutRef.current = null;
      clearSafetyTimeout();
    }, remaining);
  }, [clearHideTimeout, clearSafetyTimeout]);

  useEffect(() => {
    function onClickCapture(e: MouseEvent) {
      if (isModifiedClick(e)) return;
      const el = (e.target as HTMLElement | null)?.closest?.("a");
      if (!el || !(el instanceof HTMLAnchorElement)) return;
      if (el.target === "_blank" || el.hasAttribute("download")) return;
      const href = el.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href.startsWith("#")) return;

      let path: string;
      let search = "";
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        path = url.pathname;
        search = url.search;
      } catch {
        return;
      }

      if (path === window.location.pathname && search === window.location.search) {
        return;
      }

      navStartRef.current = Date.now();
      setVisible(true);
      clearSafetyTimeout();
      safetyTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        navStartRef.current = null;
        safetyTimeoutRef.current = null;
      }, SAFETY_MS);
    }

    function onPopState() {
      navStartRef.current = Date.now();
      setVisible(true);
      clearSafetyTimeout();
      safetyTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        navStartRef.current = null;
        safetyTimeoutRef.current = null;
      }, SAFETY_MS);
    }

    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [clearSafetyTimeout]);

  useEffect(() => {
    if (navStartRef.current == null) return;
    scheduleHideFromStart();
    return () => {
      clearHideTimeout();
    };
  }, [pathname, scheduleHideFromStart, clearHideTimeout]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-cream/75 backdrop-blur-[2px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="rounded-2xl border border-charcoal/10 bg-white/90 px-6 py-4 shadow-elevated">
        <LoadingBreadcrumb />
      </div>
    </div>
  );
}
