"use client";

import { useRef, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const EXPO_IN_OUT = "cubic-bezier(.76, 0, .24, 1)";

/**
 * One "Good to know" row on native details/summary. Stack several; borders join up.
 * The plus turns to a cross and fills ember when open; the height animates over 0.6s
 * (instant under reduced motion). Answers are one or two short sentences, and any booking
 * numbers in them must come from the owner settings.
 */
export function AccordionItem({
  question,
  children,
  defaultOpen = false,
  className,
}: {
  question: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const details = useRef<HTMLDetailsElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);

  function onToggleClick(e: React.MouseEvent) {
    const el = details.current;
    const content = body.current;
    if (reduce || !el || !content || typeof content.animate !== "function") return;
    e.preventDefault();
    anim.current?.cancel();
    // dataset.open is the intended state; el.open stays true while a close animates.
    const opening = el.dataset.open !== "true";
    el.dataset.open = String(opening);
    if (opening) el.open = true;
    const full = content.scrollHeight;
    anim.current = content.animate(
      { height: opening ? ["0px", `${full}px`] : [`${full}px`, "0px"] },
      { duration: 600, easing: EXPO_IN_OUT },
    );
    anim.current.onfinish = () => {
      if (!opening) el.open = false;
      anim.current = null;
    };
  }

  return (
    <details
      ref={details}
      open={defaultOpen}
      data-open={defaultOpen}
      onToggle={(e) => {
        // Keeps the icon in sync for native toggles (reduced motion, find-in-page).
        if (!anim.current) e.currentTarget.dataset.open = String(e.currentTarget.open);
      }}
      className={cn("group/acc border-t border-ink-line last:border-b", className)}
    >
      <summary
        onClick={onToggleClick}
        className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold"
      >
        {question}
        <span
          aria-hidden
          className={cn(
            "relative h-8 w-8 flex-none rounded-full border border-cream-faint transition-[transform,background-color,border-color,color] duration-[600ms] ease-expo-in-out",
            "before:absolute before:inset-x-[9px] before:top-1/2 before:-mt-[0.75px] before:h-[1.5px] before:bg-current",
            "after:absolute after:inset-x-[9px] after:top-1/2 after:-mt-[0.75px] after:h-[1.5px] after:rotate-90 after:bg-current",
            "group-data-[open=true]/acc:rotate-45 group-data-[open=true]/acc:border-ember group-data-[open=true]/acc:bg-ember group-data-[open=true]/acc:text-ink",
          )}
        />
      </summary>
      <div ref={body} className="overflow-hidden">
        <div className="max-w-[60ch] pb-5 text-cream-muted">{children}</div>
      </div>
    </details>
  );
}

/** The ember-bright tip card beside the accordion. One per view. Ink text on the fill. */
export function TipCard({
  title = "Good to know",
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      data-tone="cream"
      className={cn("grid gap-2 rounded-card-md bg-ember-bright p-6 text-ink", className)}
    >
      <b className="type-eyebrow">{title}</b>
      <div className="[&_p]:m-0">{children}</div>
    </aside>
  );
}
