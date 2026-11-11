"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import type { CateringGalleryImagePublic } from "@/lib/api";
import { imageSrc } from "@/lib/catering-api";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { reducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/band";
import { PhotoSlot } from "@/components/ui/photo-slot";

/**
 * Owner-managed gallery: a sideways row of tilted photos with a progress line.
 * Desktop (900px+, motion on, row wider than the screen): the section pins and vertical
 * scroll moves the row sideways; cards lean with scroll speed. Otherwise a plain swipe row.
 * Renders nothing when there are no photos. `heading` sits above the row (inside the pin).
 */
export function GalleryRow({ images, heading }: { images: CateringGalleryImagePublic[]; heading: ReactNode }) {
  const reduce = usePrefersReducedMotion();
  const outer = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);
  const pinned = dist > 0;

  const x = useMotionValue(0);
  const fill = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });
  const lean = useSpring(useTransform(useVelocity(x), [-3000, 0, 3000], [4, 0, -4], { clamp: true }), {
    stiffness: 200,
    damping: 30,
  });
  const width = useTransform(fill, (v) => `${20 + 80 * v}%`);

  // Decide whether to pin: wide screen, motion allowed, and the row overflows.
  useEffect(() => {
    // reducedMotion() too: the hook is still false on the first pass, and pinning would flash.
    if (reduce || reducedMotion()) return setDist(0);
    const mq = window.matchMedia("(min-width: 900px)");
    const measure = () => {
      const v = viewport.current;
      const r = row.current;
      const over = v && r ? r.scrollWidth - v.clientWidth : 0;
      setDist(mq.matches && over > 0 ? over : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
    };
  }, [reduce, images.length]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!pinned) return;
    x.set(-v * dist);
    fill.set(v);
  });
  useEffect(() => {
    if (!pinned) x.set(0);
  }, [pinned, x]);

  const onSwipe = () => {
    const v = viewport.current;
    if (!v || pinned) return;
    const max = v.scrollWidth - v.clientWidth;
    fill.set(max > 0 ? v.scrollLeft / max : 0);
  };

  if (!images.length) return null;

  return (
    <div ref={outer} style={pinned ? { height: `calc(100vh + ${dist}px)` } : undefined}>
      <div className={cn(pinned && "sticky top-0 flex h-screen flex-col justify-center overflow-hidden")}>
        <Container>
          {heading}
          <div
            ref={viewport}
            onScroll={onSwipe}
            tabIndex={pinned ? undefined : 0}
            aria-label="Photos from past tables"
            role="region"
            className={cn(
              "-mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              pinned ? "overflow-visible" : "snap-x snap-mandatory overflow-x-auto",
            )}
          >
            <motion.div ref={row} style={{ x }} className="flex w-max gap-5 pb-6 pt-4">
              {images.map((img, i) => (
                <motion.div key={img.id} data-cursor="View" style={{ skewX: lean }} className="rm-static snap-start">
                  <PhotoSlot
                    src={imageSrc(img.imageUrl)}
                    alt={img.caption || "A table we cooked for"}
                    radius="md"
                    sizes="400px"
                    className={cn(
                      "aspect-[4/5] w-[min(76vw,400px)] min-[900px]:w-[min(400px,42vh)]",
                      i % 2 ? "mt-6 rotate-[1.6deg]" : "-rotate-[1.6deg]",
                    )}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
          <div aria-hidden className="mt-2 h-0.5 bg-ink-line">
            <motion.i style={{ width }} className="block h-full bg-ember" />
          </div>
        </Container>
      </div>
    </div>
  );
}
