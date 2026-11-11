"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { animate } from "motion/react";
import { routeName } from "@/lib/content";
import { expo, reducedMotion } from "@/lib/motion";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Survives the template remounting (it does on some navigations, not on others).
let lastPath: string | null = null;
// A run cut short by StrictMode's unmount and remount (dev) resumes instead of being skipped.
let cut: { path: string; from: string | null } | null = null;

/**
 * Page transition (motion.md): on a route change the two panels cover the new page with its
 * name, then slide away upward, ember first, then ink-raised. The App Router cannot hold the
 * old page while panels slide in, so the cover starts already in place (set before paint).
 * Never on the first load (the preloader owns it), never to or from /admin, never for query or
 * state changes (same pathname), not under reduced motion. Children are never wrapped, so
 * fixed elements stay pinned; the panels are pointer-events-none and hidden at rest.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const ember = useRef<HTMLDivElement>(null);
  const raised = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLParagraphElement>(null);

  useIsoLayoutEffect(() => {
    const from = cut?.path === pathname ? cut.from : lastPath;
    lastPath = pathname;
    cut = null;
    const a = ember.current;
    const b = raised.current;
    if (!a || !b || !name.current) return;
    if (from === null || from === pathname || from.startsWith("/admin") || pathname.startsWith("/admin") || reducedMotion()) return;

    name.current.textContent = routeName(pathname);
    const out = ["translateY(0%)", "translateY(-100%)"];
    // Cover before this frame paints, so the new page never flashes first.
    a.style.transform = b.style.transform = out[0];
    a.style.visibility = b.style.visibility = "visible";
    const runs = [
      animate(a, { transform: out }, { duration: 0.6, ease: expo.inOut, delay: 0.1 }),
      animate(b, { transform: out }, { duration: 0.65, ease: expo.inOut, delay: 0.25 }),
    ];
    const hide = () => {
      a.style.visibility = b.style.visibility = a.style.transform = b.style.transform = "";
    };
    let done = false;
    runs[1].then(() => {
      done = true;
      hide();
    });
    return () => {
      if (!done) cut = { path: pathname, from };
      runs.forEach((r) => r.stop());
      hide();
    };
  }, [pathname]);

  const panel = "pointer-events-none invisible fixed inset-0 z-[90] translate-y-full";
  return (
    <>
      {children}
      <div ref={raised} aria-hidden className={`${panel} bg-ink-raised`} />
      <div ref={ember} aria-hidden className={`${panel} grid place-items-center bg-ember px-gutter text-ink`}>
        <p ref={name} className="display-xl m-0 text-center" />
      </div>
    </>
  );
}
