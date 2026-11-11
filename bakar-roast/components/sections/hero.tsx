"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { brand, bookCta, type HeroCopy } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/band";
import { Eyebrow } from "@/components/ui/headline";
import { Stamp } from "@/components/ui/stamp";
import { Magnetic } from "@/components/magnetic";
import { PhotoLayer, PhotoNote } from "@/components/sections/motion";

const GUTTER = "clamp(18px, 4vw, 56px)";
// Side inset that lines the photo up with the content column (wider screens centre at 1440).
const INSET = `max(${GUTTER}, calc((100% - 1440px) / 2 + ${GUTTER}))`;

/** One hero line, split into letters that rise one by one (CSS keyframes, off under reduced motion). */
function Line({ text, start }: { text: string; start: number }) {
  let n = start;
  const parts = text.split(/(\*[^*]+\*)/).filter(Boolean);
  return (
    // .ln from the prototype: the padding/negative margin pair gives about 0.91em per line.
    <span aria-hidden className="-my-[0.07em] block overflow-hidden py-[0.07em]">
      {parts.map((part, pi) => {
        const isAccent = part.startsWith("*");
        const words = (isAccent ? part.slice(1, -1) : part).split(/(\s+)/);
        const letters = words.map((w, wi) =>
          /\S/.test(w) ? (
            <span key={wi} className="inline-block whitespace-nowrap">
              {[...w].map((c, ci) => (
                <span
                  key={ci}
                  className="inline-block animate-rise motion-reduce:animate-none"
                  style={{ animationDelay: `${(n++) * 25 + 150}ms` }}
                >
                  {c}
                </span>
              ))}
            </span>
          ) : (
            w
          ),
        );
        return isAccent ? <em key={pi}>{letters}</em> : <span key={pi}>{letters}</span>;
      })}
    </span>
  );
}

/**
 * Page hero (motion.md "Hero entrance" + "Hero on scroll"). Letters rise 0.025s apart, the
 * side paragraph and action fade up, the photo settles from 1.35x. On scroll the photo grows
 * from inset and rounded to full bleed while the headline drifts up slower than the page.
 * `chips` sit top left on the photo; `stamp` adds the spinning stamp over its corner. `action` is
 * magnetic. On a first visit the CSS entrance waits for the preloader to lift (globals.css).
 */
export function Hero({
  copy,
  action,
  chips,
  stamp = false,
  headingClassName,
}: {
  copy: HeroCopy;
  action?: ReactNode;
  chips?: ReactNode;
  stamp?: boolean;
  headingClassName?: string;
}) {
  const { scrollY } = useScroll();
  const p = useTransform(scrollY, [0, 480], [0, 1], { clamp: true });
  const clipPath = useTransform(
    p,
    (v) => `inset(0 calc(${1 - v} * ${INSET}) round ${(1 - v) * 36}px)`,
  );
  const drift = useTransform(scrollY, [0, 900], [0, 180], { clamp: true });

  const label = copy.lines.join(" ").replace(/\*/g, "");
  let count = 0;
  const lines = copy.lines.map((line) => {
    const start = count;
    count += line.replace(/[\s*]/g, "").length;
    return <Line key={line} text={line} start={start} />;
  });

  return (
    <section className="relative overflow-x-clip pt-[clamp(120px,13vw,190px)]">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-12%] top-[4%] h-[70vw] max-h-[min(1000px,100%)] w-[70vw] max-w-[1000px] bg-[radial-gradient(closest-side,rgba(232,106,28,.2),transparent)]"
      />
      <Container>
        <div
          className={cn(
            "relative grid items-end gap-7",
            copy.body && "min-[900px]:grid-cols-[1fr_minmax(260px,340px)]",
          )}
        >
          <motion.div style={{ y: drift }} className="rm-static grid gap-5">
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <h1 aria-label={label} className={cn("display-hero m-0", headingClassName)}>
              {lines}
            </h1>
          </motion.div>
          {(copy.body || action) && (
            <div
              className="grid justify-items-start gap-6 pb-[1vw] animate-fade-up motion-reduce:animate-none"
              style={{ animationDelay: "450ms" }}
            >
              {copy.body && <p className="m-0 max-w-[34ch] text-[17px] text-cream-muted">{copy.body}</p>}
              {action && <Magnetic>{action}</Magnetic>}
            </div>
          )}
        </div>
      </Container>

      {copy.photo && (
        <div className="relative mt-[clamp(32px,5vw,72px)]">
          <motion.div
            style={{ clipPath } as unknown as CSSProperties}
            className="hero-bleed relative isolate min-h-[clamp(300px,46vw,640px)] overflow-hidden"
          >
            <div className="absolute inset-0 -z-10 animate-settle motion-reduce:animate-none">
              <PhotoLayer note={copy.photo} sizes="100vw" />
            </div>
            <Container className="absolute inset-0 h-full">
              <div className="relative h-full">
                {chips && <div className="absolute left-4 top-4 flex flex-wrap gap-2">{chips}</div>}
                <PhotoNote note={copy.photo} />
              </div>
            </Container>
          </motion.div>
          {stamp && (
            <Container className="pointer-events-none absolute inset-x-0 -bottom-12 z-[2]">
              <div className="flex justify-end pr-[clamp(16px,4vw,56px)]">
                <Stamp
                  className="pointer-events-auto"
                  text="Fire • Feast • Family • Fire • Feast • Family • "
                  label={`${brand.tagline} ${bookCta.label}`}
                  href={bookCta.href}
                />
              </div>
            </Container>
          )}
        </div>
      )}
    </section>
  );
}
