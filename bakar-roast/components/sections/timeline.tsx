"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { expo } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { PhotoSlot } from "@/components/ui/photo-slot";

type Chapter = { year: string; title: string; body: string; photo: string };

/**
 * Story timeline: a line that draws downward as you scroll, a dot per chapter (filled once
 * reached, hollow before, so the state reads without colour), the year in ember-bright
 * sliding in from the left, title, text and a photo. Phone: photo drops under the text.
 * Reduced motion: line fully drawn and every dot reached.
 */
export function Timeline({ chapters }: { chapters: Chapter[] }) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.6", "end 0.6"] });
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const ol = ref.current;
    if (!ol) return;
    const items = Array.from(ol.children) as HTMLElement[];
    if (reduce) {
      items.forEach((li) => (li.dataset.reached = "true"));
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.6;
      items.forEach((li) => (li.dataset.reached = String(li.getBoundingClientRect().top < line)));
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
    <div className="relative max-w-[980px]">
      <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-ink-line" />
      <motion.span
        aria-hidden
        style={{ scaleY: draw }}
        className="rm-static absolute bottom-2 left-[7px] top-2 w-0.5 origin-top bg-ember"
      />
      <ol ref={ref} className="m-0 grid list-none gap-12 p-0 pl-10">
        {chapters.map((c) => (
          <li
            key={c.title}
            data-reached="false"
            className="group/ch relative grid items-start gap-6 sm:grid-cols-[1fr_200px]"
          >
            <span
              aria-hidden
              className="absolute -left-10 top-2 z-[1] h-4 w-4 rounded-full border-2 border-cream-faint bg-ink transition-colors duration-300 group-data-[reached=true]/ch:border-ember group-data-[reached=true]/ch:bg-ember"
            />
            <div>
              <motion.div
                className="rm-static font-display text-5xl font-extrabold uppercase leading-[0.84] text-ember-bright [font-stretch:80%]"
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 0.8, ease: expo.out }}
              >
                {c.year}
              </motion.div>
              <h3 className="mb-1 mt-3 text-xl font-bold">{c.title}</h3>
              <p className="m-0 max-w-[52ch] text-cream-muted">{c.body}</p>
            </div>
            <PhotoSlot note={c.photo} radius="md" className="min-h-[140px]" />
          </li>
        ))}
      </ol>
    </div>
  );
}
