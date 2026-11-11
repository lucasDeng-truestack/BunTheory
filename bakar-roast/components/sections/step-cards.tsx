"use client";

import { motion } from "motion/react";
import { expo } from "@/lib/motion";

/**
 * "Four steps to a full table." Ordered list of ink-raised cards with an ember number.
 * Desktop: four across, each 32px lower than the one before. 641 to 1000px: two by two.
 * Phone: one column, no stagger. Cards rise in from further down the later they are.
 * Safe on a cream band: each card resets to the ink tone.
 */
export function StepCards({ steps }: { steps: { title: string; line: string }[] }) {
  return (
    <ol className="m-0 grid list-none items-start gap-4 p-0 min-[641px]:grid-cols-2 min-[1001px]:grid-cols-4">
      {steps.map((s, i) => (
        <motion.li
          key={s.title}
          data-tone="ink"
          className="rm-static grid content-between gap-3 rounded-card-md bg-ink-raised p-6 text-cream min-[641px]:min-h-[200px] min-[1001px]:[margin-top:var(--drop)]"
          style={{ "--drop": `${i * 32}px` } as React.CSSProperties}
          initial={{ opacity: 0, y: 60 + i * 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          transition={{ duration: 0.8, ease: expo.out, delay: i * 0.08 }}
        >
          <span className="font-display text-[32px] font-extrabold leading-[0.9] text-ember [font-stretch:80%]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="grid gap-2">
            <h3 className="display-sm m-0">{s.title}</h3>
            <p className="m-0 text-[15px] text-cream-muted">{s.line}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
