"use client";

import { useEffect, useRef } from "react";
import type { LeadPart } from "@/lib/content";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { Band, Container } from "@/components/ui/band";
import { Eyebrow } from "@/components/ui/headline";
import { PhotoTrail } from "@/components/photo-trail";

/**
 * Eyebrow + large `lead` paragraph. Words go from 14% to full opacity as you scroll through,
 * and the inline pill photos grow from zero width when reached (classes in globals.css).
 * Reduced motion: all words lit and pills open, by CSS. Hosts the page's hover photo trail.
 */
export function IntroLead({ eyebrow, lead }: { eyebrow: string; lead: LeadPart[] }) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const p = ref.current;
    if (!p || reduce) return;
    const parts = Array.from(p.querySelectorAll<HTMLElement>("[data-on]"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const r = p.getBoundingClientRect();
      const prog = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const n = Math.round(prog * parts.length);
      parts.forEach((el, i) => (el.dataset.on = String(i < n)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduce]);

  return (
    <Band>
      {/* The page's one hover photo trail, over the whole band (padding included). */}
      <PhotoTrail className="-my-section py-section">
        <Container className="grid gap-8 min-[900px]:grid-cols-[200px_1fr]">
          <Eyebrow className="self-start">{eyebrow}</Eyebrow>
          <p ref={ref} className="type-lead m-0 max-w-[24em] text-pretty">
            {lead.map((part, i) =>
              typeof part === "string" ? (
                part.split(/(\s+)/).map((w, j) =>
                  /\S/.test(w) ? (
                    <span key={`${i}-${j}`} data-on="false" className="lead-word">
                      {w}
                    </span>
                  ) : (
                    w
                  ),
                )
              ) : (
                // Decorative: a gradient pill until the real photo lands. Spaces either side.
                <span key={i}>
                  {" "}
                  <span aria-hidden data-on="false" className="lead-pill photo-gradient" />{" "}
                </span>
              ),
            )}
          </p>
        </Container>
      </PhotoTrail>
    </Band>
  );
}
