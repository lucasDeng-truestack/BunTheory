"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import { duration, expo } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Headline, type HeadlineSize } from "@/components/ui/headline";
import { accent } from "@/components/sections/accent";

/*
 * Page-level motion primitives (motion.md). Hydration rule: server and client always render
 * the same elements with the same initial styles. Reduced motion is handled in CSS by the
 * `.rm-static` class (globals.css), which pins transform, opacity, clip-path and filter to
 * their resting values, so nothing here branches on the media query.
 */

const inView = { once: true, margin: "0px 0px -8% 0px" } as const;

/** General reveal: fades up 50px. Pass `index` to batch siblings 0.1s apart. */
export function Reveal({
  children,
  className,
  index = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  as?: "div" | "li" | "figure" | "section";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={cn("rm-static", className)}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={inView}
      transition={{ duration: duration.default, ease: expo.out, delay: (index % 4) * 0.1 }}
    >
      {children}
    </Tag>
  );
}

const wordParent: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.05 } } };
const wordChild: Variants = {
  hidden: { y: "110%", rotate: 6 },
  shown: { y: "0%", rotate: 0, transition: { duration: duration.default, ease: expo.out } },
};

function maskWords(node: ReactNode, key = "w"): ReactNode {
  if (typeof node === "string") {
    return node.split(/(\s+)/).map((w, i) =>
      /\S/.test(w) ? (
        <span key={`${key}${i}`} className="-my-[0.07em] inline-block overflow-hidden py-[0.07em] align-top">
          <motion.span variants={wordChild} className="rm-static inline-block origin-bottom-left">
            {w}
          </motion.span>
        </span>
      ) : (
        w
      ),
    );
  }
  if (Array.isArray(node)) return node.map((n, i) => maskWords(n, `${key}${i}-`));
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el, { key }, maskWords(el.props.children, `${key}c`));
  }
  return node;
}

/**
 * Section headline: eyebrow + display headline whose words slide up from behind a mask
 * with a slight tilt, 0.05s apart. `children` is a string with the accent in *stars*.
 */
export function SectionHead({
  eyebrow,
  children,
  size = "xl",
  as = "h2",
  className,
  headingClassName,
}: {
  eyebrow?: ReactNode;
  children: string;
  size?: HeadlineSize;
  as?: ElementType;
  className?: string;
  headingClassName?: string;
}) {
  return (
    <Headline
      eyebrow={eyebrow}
      size={size}
      as={as}
      className={cn(eyebrow && "mb-[clamp(32px,5vw,72px)]", className)}
      headingClassName={cn(!eyebrow && "mb-[clamp(32px,5vw,72px)]", headingClassName)}
    >
      <motion.span initial="hidden" whileInView="shown" viewport={inView} variants={wordParent}>
        {Children.toArray(maskWords(accent(children)))}
      </motion.span>
    </Headline>
  );
}

/**
 * Photo reveal + parallax: the frame wipes open from the bottom while the photo settles
 * from 1.4x, then drifts 8% against the scroll. Size the frame with className.
 * The note sits on the frame (not the moving layer) so it never drifts out of view.
 */
export function RevealPhoto({
  note,
  src,
  className,
  radius = "rounded-card-lg",
  sizes = "100vw",
}: {
  note: string;
  src?: string | null;
  className?: string;
  radius?: string;
  sizes?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  return (
    <motion.div
      ref={ref}
      className={cn("rm-static relative isolate overflow-hidden photo-gradient", radius, className)}
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={inView}
      transition={{ duration: 1.1, ease: expo.inOut }}
    >
      <motion.div style={{ y }} className="rm-static absolute inset-x-0 -inset-y-[9%] -z-10">
        <motion.div
          className="rm-static h-full"
          initial={{ scale: 1.4 }}
          whileInView={{ scale: 1 }}
          viewport={inView}
          transition={{ duration: 1.4, ease: expo.out }}
        >
          <PhotoLayer src={src} note={note} sizes={sizes} />
        </motion.div>
      </motion.div>
      {!src && <PhotoNote note={note} />}
    </motion.div>
  );
}


/** The image itself, filling its parent (gradient shows through until it loads). */
export function PhotoLayer({ src, note, sizes }: { src?: string | null; note: string; sizes?: string }) {
  return (
    <div className="photo-gradient relative h-full w-full">
      {src && <Image src={src} alt={note.replace(/^Photo:\s*/, "")} fill sizes={sizes} className="object-cover" />}
    </div>
  );
}

/** The "Photo: ..." label in PhotoSlot's style, bottom left of a frame. */
export function PhotoNote({ note, className }: { note: string; className?: string }) {
  return (
    <span
      className={cn(
        "absolute bottom-4 left-4 max-w-[32ch] rounded-lg bg-ink/80 px-2.5 py-1.5 text-[13px] leading-[1.3] text-cream",
        className,
      )}
    >
      {note}
    </span>
  );
}
