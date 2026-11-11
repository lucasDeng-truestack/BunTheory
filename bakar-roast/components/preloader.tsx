"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion/react";
import { expo } from "@/lib/motion";

/**
 * First-visit intro (motion.md "Preloader"): the wordmark and a counter running 00 to 100 over
 * 2.6s while four gradient photo panels wipe in one after another; the last scales up to fill
 * the screen, then the loader wipes upward.
 *
 * Whether it plays is decided before first paint by the inline script below, which sets
 * `<html data-preload="cover">`. CSS (globals.css) then shows `.preloader`, locks scroll and
 * pauses the page's CSS entrances (the hero letters) until the script here switches the
 * attribute to "lift". Removed attribute = loader gone. So the server and client always render
 * the same markup, and when it does not play (seen this session, reduced motion, admin, booking,
 * account and status pages, no JS) nothing is ever painted and the hero runs at once.
 */

const SEEN_KEY = "br-preloader-seen";
// Pages where it never plays: the admin, and the calm booking, status and account pages.
const SKIP = "^/(admin|catering/book|booking|account)(/|$)";

const SCRIPT = `(function(){try{var d=document.documentElement;if(new RegExp(${JSON.stringify(SKIP)}).test(location.pathname)||matchMedia("(prefers-reduced-motion: reduce)").matches||sessionStorage.getItem(${JSON.stringify(SEEN_KEY)})==="1")return;d.setAttribute("data-preload","cover");window.__brPreload=setTimeout(function(){d.removeAttribute("data-preload")},8000)}catch(e){}})()`;

const PANELS = [
  { tilt: -4, look: "photo-gradient" },
  { tilt: 3, look: "cta-gradient" },
  { tilt: -2, look: "photo-gradient" },
  { tilt: 0, look: "cta-gradient" },
];
const CLOSED = "inset(100% 0% 0% 0%)";
const OPEN = "inset(0% 0% 0% 0%)";

// A real unmount (not StrictMode's remount) must never leave the page locked.
let releaseTimer: ReturnType<typeof setTimeout> | undefined;

export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLParagraphElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const type = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearTimeout(releaseTimer);
    const html = document.documentElement;
    const el = root.current;
    const box = stack.current;
    if (html.getAttribute("data-preload") !== "cover" || !el || !box || !word.current || !count.current || !type.current) return;
    clearTimeout((window as { __brPreload?: ReturnType<typeof setTimeout> }).__brPreload);

    const panels = Array.from(box.children) as HTMLElement[];
    const last = panels[panels.length - 1];
    const counter = count.current;
    // Fill the screen with the last panel, with room for its corners.
    const fill = Math.max(window.innerWidth / last.offsetWidth, window.innerHeight / last.offsetHeight) * 1.2;
    const lift = (attr: "lift" | null) => (attr ? html.setAttribute("data-preload", attr) : html.removeAttribute("data-preload"));
    const finish = () => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
      lift(null);
    };

    const runs = [
      animate(word.current, { opacity: [0, 1], transform: ["translateY(40px)", "translateY(0px)"] }, { duration: 0.8, ease: expo.out }),
      animate(0, 100, {
        duration: 2.6,
        ease: [0.65, 0, 0.35, 1],
        onUpdate: (v) => (counter.textContent = String(Math.round(v)).padStart(2, "0")),
      }),
      ...panels.map((p, i) =>
        animate(p, { clipPath: [CLOSED, OPEN] }, { duration: 0.8, ease: expo.inOut, delay: 0.15 + i * 0.55 }),
      ),
      animate(
        last,
        { transform: [`rotate(${PANELS[PANELS.length - 1].tilt}deg) scale(1)`, `rotate(0deg) scale(${fill})`] },
        { duration: 0.8, ease: expo.inOut, delay: 2.6 },
      ),
      // On the wrapper: a second opacity animation on the word itself would cancel its entrance.
      animate(type.current, { opacity: [1, 0] }, { duration: 0.4, ease: expo.out, delay: 2.6 }),
      animate(el, { clipPath: [OPEN, "inset(0% 0% 100% 0%)"] }, { duration: 0.8, ease: expo.inOut, delay: 3.4 }),
    ];
    // The hero entrance starts as the loader lifts off its top half.
    const timers = [setTimeout(() => lift("lift"), 3750), setTimeout(finish, 4200)];

    return () => {
      runs.forEach((r) => r.stop());
      timers.forEach(clearTimeout);
      releaseTimer = setTimeout(finish, 50);
    };
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
      <div
        ref={root}
        aria-hidden
        role="presentation"
        data-lenis-prevent
        className="preloader fixed inset-0 z-[100] place-items-center overflow-hidden bg-ink text-cream"
      >
        <div ref={stack} className="relative aspect-[4/5] h-[min(54vh,440px)]">
          {PANELS.map((p, i) => (
            <div
              key={i}
              className={`${p.look} absolute inset-0 rounded-card-md`}
              style={{ clipPath: CLOSED, transform: `rotate(${p.tilt}deg)` }}
            />
          ))}
        </div>
        <div ref={type} className="absolute inset-0">
          <p
            ref={word}
            className="display-xl absolute bottom-[clamp(24px,4vw,56px)] left-gutter m-0 opacity-0"
          >
            Bakar <span className="text-ember">&amp;</span> Roast
          </p>
          <span
            ref={count}
            className="display-xl absolute right-gutter top-[calc(24px+env(safe-area-inset-top))] tabular-nums sm:bottom-[clamp(24px,4vw,56px)] sm:top-auto"
          >
            00
          </span>
        </div>
      </div>
    </>
  );
}
