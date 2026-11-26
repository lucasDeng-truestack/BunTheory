"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform, useVelocity } from "motion/react";
import { useIsTouch, usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { PhotoNote } from "@/components/sections/motion";

export type ListRowItem = {
  title: string;
  /** What the hover photo should show ("Photo: ..."). */
  photo: string;
  href?: string;
  external?: boolean;
  /** Small line under the title. */
  note?: string;
  /** Right-hand label instead of the arrow (rows without a link). */
  tag?: string;
};

/**
 * Numbered rows with a huge title and a round arrow (ListRow). The whole row is the link.
 * Hairlines are decorative ink-line. On fine pointers a photo follows the cursor, swaps per
 * row and tilts with pointer speed; touch and reduced motion get the plain list.
 */
export function ListRows({
  items,
  label,
  start = 1,
  className,
}: {
  items: ListRowItem[];
  label: string;
  /** First row number (menu sections continue the count). */
  start?: number;
  className?: string;
}) {
  const touch = useIsTouch();
  const reduce = usePrefersReducedMotion();
  const follow = !touch && !reduce;
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 30, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 300, damping: 30, mass: 0.6 });
  const rotate = useTransform(useVelocity(sx), [-2000, 0, 2000], [-12, 0, 12], { clamp: true });

  function onMove(e: React.PointerEvent) {
    if (!follow || e.pointerType !== "mouse" || !box.current) return;
    const r = box.current.getBoundingClientRect();
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  }

  return (
    <div ref={box} className={cn("relative", className)} onPointerMove={onMove} onPointerLeave={() => setActive(null)}>
      <ul aria-label={label} className="m-0 list-none p-0">
        {items.map((item, i) => {
          const no = String(start + i).padStart(2, "0");
          const inner = (
            <>
              <span className="type-eyebrow text-cream-faint">{no}</span>
              <span className="grid gap-2">
                <span className="font-display text-[length:clamp(36px,6vw,80px)] font-extrabold uppercase leading-[0.84] tracking-[-0.025em] transition-colors duration-300 [font-stretch:80%] group-hover/row:text-ember">
                  {item.title}
                  {item.external && <span className="sr-only"> (opens in a new tab)</span>}
                </span>
                {item.note && <span className="max-w-[56ch] text-cream-muted">{item.note}</span>}
              </span>
              {item.href ? (
                <span className="grid h-14 w-14 flex-none place-items-center rounded-full border border-cream-faint transition-colors duration-300 group-hover/row:border-ember group-hover/row:bg-ember group-hover/row:text-ink">
                  <ArrowUpRight aria-hidden size={18} strokeWidth={1.75} />
                </span>
              ) : (
                item.tag && (
                  <span className="type-eyebrow whitespace-nowrap rounded-full border border-cream-faint px-3 py-2 text-cream-muted">
                    {item.tag}
                  </span>
                )
              )}
            </>
          );
          const rowClass =
            "group/row grid min-h-11 grid-cols-[32px_1fr_auto] items-center gap-4 border-t border-ink-line py-6 text-cream no-underline sm:grid-cols-[48px_1fr_auto]";
          return (
            <li
              key={item.title}
              data-cursor={item.href ? "View" : undefined}
              className="last:border-b last:border-ink-line"
              onPointerEnter={() => setActive(i)}
            >
              {item.href ? (
                item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className={rowClass}>
                    {inner}
                  </a>
                ) : (
                  <Link href={item.href} className={rowClass}>
                    {inner}
                  </Link>
                )
              ) : (
                <div className={rowClass}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Cursor photo: always in the DOM (same tree on server and client), shown only on fine pointers. */}
      <motion.div
        aria-hidden
        style={{ x: sx, y: sy, rotate }}
        className={cn(
          "pointer-events-none absolute left-0 top-0 z-10 -ml-[140px] -mt-[90px] hidden h-[180px] w-[280px] overflow-hidden rounded-card-md shadow-glow-ember transition-opacity duration-300 lg:block",
          follow && active !== null ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="photo-gradient relative h-full w-full">
          {active !== null && <PhotoNote note={items[active].photo} className="bottom-3 left-3" />}
        </div>
      </motion.div>
    </div>
  );
}
