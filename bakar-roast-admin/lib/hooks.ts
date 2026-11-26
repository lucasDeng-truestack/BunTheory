"use client";

import { useEffect, useState } from "react";

/** Live value of a media query: false on the server and the first client render, real after mount. */
function useMedia(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/**
 * True when the user asked for reduced motion. False on the server and on the first client
 * render (so markup always matches), the real value after mount, and it follows changes.
 * Use it in effects and handlers only; the first frame is kept still by CSS (`.rm-static`,
 * `motion-reduce:`), never by this value.
 */
export const usePrefersReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");

/**
 * True on touch / coarse-pointer devices. Use to disable desktop-only flourishes
 * (custom cursor, magnetic buttons, pointer-tilt, mouse-parallax).
 */
export const useIsTouch = () => useMedia("(pointer: coarse)");
