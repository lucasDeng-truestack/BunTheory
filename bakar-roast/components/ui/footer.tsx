"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useInView } from "motion/react";
import { brand, footerColumns } from "@/lib/content";
import { expo, duration } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { Container } from "@/components/ui/band";
import { Logo } from "@/components/ui/logo";

/**
 * Slide-out (motion.md "Footer"): while the footer scrolls in, its content is held still against
 * the screen, so the page seems to scroll up off a footer sitting behind it. Done in CSS
 * (`.footer-reveal` in globals.css): the content is fixed to the bottom of the screen and the
 * footer box clips it, so the browser pins it and it cannot lag the scroll. A scroll-linked
 * transform here trembled, because it always ran a frame behind the smooth scroll. The footer
 * keeps the content's height; it only pins when the content fits the screen, and never under
 * reduced motion.
 */
function SlideOut({ rootRef, children }: { rootRef: RefObject<HTMLElement>; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    const box = inner.current;
    if (!el || !box) return;
    const sync = () => {
      const h = box.offsetHeight;
      el.style.height = `${h}px`;
      el.dataset.pinned = String(h <= window.innerHeight);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(box);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [rootRef]);

  return (
    <footer ref={rootRef} className="footer-reveal bg-ink-soft text-cream">
      <div ref={inner} className="footer-reveal-inner pt-10 sm:pt-16">
        {children}
      </div>
    </footer>
  );
}

/**
 * Site footer: ink-soft ground, link columns, WhatsApp and tagline, then the logo, centred
 * (it rises into place when it enters view).
 * Not rendered on /admin or in the booking flow (/catering/book).
 */
export function Footer({ whatsappDisplay }: { whatsappDisplay: string }) {
  // Non-breaking, so the number never splits across lines in a narrow column.
  const number = whatsappDisplay.replace(/-/g, "\u2011").replace(/ /g, "\u00a0");
  const pathname = usePathname() ?? "/";
  const reduce = usePrefersReducedMotion();
  const footerRef = useRef<HTMLElement>(null);
  // The logo is pinned to the bottom of the screen, so "in view" is judged on the footer box:
  // once it has come up far enough to uncover it.
  const uncovered = useInView(footerRef, { once: true, margin: "0px 0px -80px 0px" });
  const hide = pathname.startsWith("/admin") || pathname.startsWith("/catering/book");

  if (hide) return null;

  return (
    <SlideOut rootRef={footerRef}>
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
                        {link.whatsapp ? `${link.label} ${number}` : link.label}
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

        {/* The logo rises into place once the footer has come up far enough to uncover it. */}
        <div className="flex justify-center overflow-hidden pb-[clamp(24px,4vw,56px)]">
          <motion.div
            className="rm-static"
            initial={{ y: "30%", opacity: 0 }}
            animate={uncovered ? { y: 0, opacity: 1 } : { y: "30%", opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: duration.default, ease: expo.out }}
          >
            <Logo className="h-[clamp(180px,30vw,380px)]" />
          </motion.div>
        </div>
      </Container>
    </SlideOut>
  );
}
