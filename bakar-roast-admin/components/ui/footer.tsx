"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform } from "motion/react";
import { brand, footerColumns } from "@/lib/content";
import { expo, duration } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { Container } from "@/components/ui/band";

const NAME = ["Bakar", "&", "Roast"];

/**
 * Size the name so it spans the content width exactly. The face has an optical-size axis,
 * so letter widths shift with size: measure, scale, and repeat a few times.
 */
function fitName(el: HTMLElement) {
  const range = document.createRange();
  let size = 100;
  for (let i = 0; i < 4; i++) {
    el.style.fontSize = `${size}px`;
    range.selectNodeContents(el);
    const w = range.getBoundingClientRect().width;
    if (!(w > 0)) {
      el.style.fontSize = "";
      return;
    }
    size = ((size * el.clientWidth) / w) * 0.985;
  }
  el.style.fontSize = `${size}px`;
}

/**
 * Slide-out (motion.md "Footer"): while the footer scrolls in, its content is held still against
 * the screen, so the page seems to scroll up off a footer sitting behind it. A transform only:
 * no extra scroll height, no fixed layer, clipped by the footer. Pinned flat by `.rm-static`
 * under reduced motion. The brand letters, clipped too, rise when they are actually uncovered.
 */
function SlideOut({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, (p) => `${(p - 1) * 100}%`);
  return (
    <footer ref={ref} className="overflow-hidden bg-ink-soft text-cream">
      <motion.div style={{ y }} className="rm-static pt-10 sm:pt-16">
        {children}
      </motion.div>
    </footer>
  );
}

/**
 * Site footer: ink-soft ground, link columns, WhatsApp and tagline, then "BAKAR & ROAST"
 * edge to edge (decorative, shown whole, letters rise one by one when it enters view).
 * Not rendered on /admin or in the booking flow (/catering/book).
 */
export function Footer() {
  const pathname = usePathname() ?? "/";
  const reduce = usePrefersReducedMotion();
  const nameRef = useRef<HTMLParagraphElement>(null);
  const hide = pathname.startsWith("/admin") || pathname.startsWith("/catering/book");

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    let lastWidth = 0;
    const run = () => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      fitName(el);
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(el);
    // Re-measure once the real face has loaded (the fallback has different widths).
    document.fonts?.ready.then(() => {
      lastWidth = 0;
      run();
    });
    return () => ro.disconnect();
  }, [hide]);

  if (hide) return null;

  let index = 0;
  return (
    <SlideOut>
      <Container>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 pb-10 md:grid-cols-4">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h2 className="type-eyebrow mb-3 mt-0 text-cream-faint">{col.title}</h2>
              <ul className="m-0 list-none p-0">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center text-cream no-underline hover:text-ember"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="inline-flex min-h-11 items-center text-cream no-underline hover:text-ember">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-2 md:col-span-1">
            <h2 className="type-eyebrow mb-3 mt-0 text-cream-faint">{brand.tagline}</h2>
            <p className="m-0 text-cream-muted">
              Founded by John Zachariah and Grace Sheila. {brand.location}.
            </p>
          </div>
        </div>

        <p
          ref={nameRef}
          aria-hidden
          className="m-0 overflow-hidden whitespace-nowrap pb-[clamp(20px,3vw,44px)] text-center font-display text-[15vw] font-extrabold uppercase leading-[0.84] tracking-[-0.03em] [font-stretch:75%]"
        >
          {NAME.map((word, w) => (
            <span key={word} className={word === "&" ? "text-ember" : undefined}>
              {w > 0 && " "}
              {word.split("").map((ch) => {
                const i = index++;
                // Same tree on server and client; reduced motion just lands instantly.
                return (
                  <motion.span
                    key={i}
                    className="rm-static inline-block"
                    initial={{ y: "105%" }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true }}
                    transition={reduce ? { duration: 0 } : { duration: duration.default, ease: expo.out, delay: i * 0.05 }}
                  >
                    {ch}
                  </motion.span>
                );
              })}
            </span>
          ))}
        </p>
      </Container>
    </SlideOut>
  );
}
