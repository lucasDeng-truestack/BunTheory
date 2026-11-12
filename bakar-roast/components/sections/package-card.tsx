"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, motionValue, useTransform, type MotionValue } from "motion/react";
import type { CateringPackagePublic } from "@/lib/api";
import { imageSrc } from "@/lib/catering-api";
import { packagesCopy } from "@/lib/content";
import { expo } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/magnetic";
import { PhotoLayer, PhotoNote } from "@/components/sections/motion";

/** "20 to 40 guests", or "From 60 guests" when there is no maximum. */
export const guestRange = (p: Pick<CateringPackagePublic, "minGuests" | "maxGuests">) =>
  p.maxGuests == null ? `From ${p.minGuests} guests` : `${p.minGuests} to ${p.maxGuests} guests`;

const PANEL = ["bg-ember", "bg-ember-bright", "bg-cream"] as const;

const photoNote = (p: CateringPackagePublic) => `Photo: ${p.name}, laid out at a real table.`;

type Common = { pkg: CateringPackagePublic; index: number; className?: string };
export type PackageCardProps =
  | (Common & { mode?: "landing" })
  | (Common & { mode: "select"; selected: boolean; onSelect: () => void; tabIndex?: number });

/**
 * The catering package card: photo left, tinted panel right (ember, bright, cream by index),
 * number, name, tagline, included items, guest range. No price, ever.
 * - mode "landing": "Book this" links to /catering/book?package=<id>; photo settles from 1.3x
 *   and the list slides in from the right when seen.
 * - mode "select" (booking step 2): the card itself is the radio (role="radio", aria-checked,
 *   Space/Enter selects); "Choose this" is a visual label. Fades in only. Put the cards in a
 *   role="radiogroup" with an aria-label.
 */
export function PackageCard(props: PackageCardProps) {
  const { pkg, index, className } = props;
  const landing = props.mode !== "select";
  const no = String(index + 1).padStart(2, "0");
  const src = imageSrc(pkg.imageUrl) || null;
  const note = photoNote(pkg);
  const titleId = `pkg-${pkg.id}-title`;

  const photo = (
    <div className="relative isolate min-h-[220px] overflow-hidden">
      <motion.div
        className="rm-static absolute inset-0 -z-10"
        initial={landing ? { scale: 1.3 } : false}
        whileInView={landing ? { scale: 1 } : undefined}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1.4, ease: expo.out }}
      >
        <PhotoLayer src={src} note={note} sizes="(min-width: 640px) 50vw, 100vw" />
      </motion.div>
      {!src && <PhotoNote note={note} />}
    </div>
  );

  const panel = (
    <div
      data-tone="cream"
      className={cn("flex flex-col gap-4 p-6 text-ink sm:p-8", PANEL[index % PANEL.length])}
    >
      <span className="text-sm font-bold leading-none tracking-[0.1em]">{no}</span>
      <h3
        id={titleId}
        className="m-0 font-display text-[44px] font-extrabold uppercase leading-[0.84] tracking-[-0.025em] [font-stretch:80%] sm:text-[56px]"
      >
        {pkg.name}
      </h3>
      {(pkg.tagline || pkg.description) && <p className="m-0">{pkg.tagline || pkg.description}</p>}
      {pkg.includes.length > 0 && (
        <ul className="m-0 list-none border-t border-ink p-0 pt-4 text-[15px] sm:columns-2 sm:gap-6">
          {pkg.includes.map((item, i) => (
            <motion.li
              key={item}
              className="rm-static break-inside-avoid py-1"
              initial={landing ? { opacity: 0, x: 40 } : false}
              whileInView={landing ? { opacity: 1, x: 0 } : undefined}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, ease: expo.out, delay: 0.1 + i * 0.05 }}
            >
              {item}
            </motion.li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
        <span className="font-bold">{guestRange(pkg)}</span>
        {landing ? (
          <Magnetic>
            <Button
              href={`/catering/book?package=${encodeURIComponent(pkg.id)}`}
              variant="ink"
              aria-label={`Book this: ${pkg.name}`}
            >
              Book this
            </Button>
          </Magnetic>
        ) : (
          <span
            aria-hidden
            className="inline-flex h-14 items-center gap-5 rounded-full bg-ink pl-7 pr-2 font-semibold text-cream"
          >
            {props.selected ? "Chosen" : "Choose this"}
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ember text-ink">
              <ArrowUpRight size={16} strokeWidth={1.75} />
            </span>
          </span>
        )}
      </div>
      <p className="m-0 text-[13px]">{packagesCopy.quote}</p>
    </div>
  );

  const card = "grid overflow-hidden rounded-card-lg sm:min-h-[420px] sm:grid-cols-2";

  if (landing) {
    return (
      <article aria-labelledby={titleId} data-cursor="View" className={cn(card, className)}>
        {photo}
        {panel}
      </article>
    );
  }

  const { selected, onSelect } = props;
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onSelect();
    }
  };
  return (
    <motion.div
      role="radio"
      aria-checked={selected}
      aria-labelledby={titleId}
      tabIndex={props.tabIndex ?? 0}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: expo.out }}
      className={cn(
        card,
        "rm-static cursor-pointer text-left",
        // Selected reads by the cream ring and the "Chosen" label, not colour alone.
        selected && "shadow-[0_0_0_4px_theme(colors.ink.DEFAULT),0_0_0_7px_theme(colors.cream.DEFAULT)]",
        className,
      )}
    >
      {photo}
      {panel}
    </motion.div>
  );
}

/** One stacked card: shrinks to 88%, tilts 1.5 degrees and dims as `p` (next card's overlap) goes 0 to 1. */
function StackItem({ p, children }: { p: MotionValue<number>; children: React.ReactNode }) {
  const scale = useTransform(p, [0, 1], [1, 0.88]);
  const rotate = useTransform(p, [0, 1], [0, -1.5]);
  const filter = useTransform(p, (v) => `brightness(${1 - 0.45 * v})`);
  return (
    <motion.div style={{ scale, rotate, filter }} className="rm-static origin-top will-change-transform">
      {children}
    </motion.div>
  );
}

/**
 * The /catering package stack. From 900px each card sticks under the header while the next
 * slides over it. One package: a single card, no stacking.
 */
export function PackageStack({ packages }: { packages: CateringPackagePublic[] }) {
  const reduce = usePrefersReducedMotion();
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const progress = useRef(packages.map(() => motionValue(0)));
  const stack = packages.length > 1;

  useEffect(() => {
    if (!stack || reduce) return;
    const mq = window.matchMedia("(min-width: 900px)");
    let raf = 0;
    const update = () => {
      raf = 0;
      const els = items.current;
      els.forEach((el, i) => {
        const next = els[i + 1];
        const mv = progress.current[i];
        if (!el || !next || !mv || !mq.matches) return mv?.set(0);
        const r = el.getBoundingClientRect();
        const overlap = (r.bottom - next.getBoundingClientRect().top) / r.height;
        mv.set(Math.max(0, Math.min(1, overlap)));
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [stack, reduce]);

  return (
    <div className="grid gap-6">
      {packages.map((pkg, i) => (
        <div
          key={pkg.id}
          ref={(el) => {
            items.current[i] = el;
          }}
          className={cn(stack && "min-[900px]:sticky min-[900px]:top-24 motion-reduce:min-[900px]:static")}
        >
          <StackItem p={progress.current[i] ?? motionValue(0)}>
            <PackageCard pkg={pkg} index={i} mode="landing" />
          </StackItem>
        </div>
      ))}
    </div>
  );
}
