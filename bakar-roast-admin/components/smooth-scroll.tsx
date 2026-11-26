"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 }}
    >
      {children}
    </ReactLenis>
  );
}
