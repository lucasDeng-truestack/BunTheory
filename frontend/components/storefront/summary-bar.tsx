"use client";

import { cn } from "@/lib/utils";
import { formatRM } from "@/lib/money";

export interface SummaryBarProps {
  /** Total item count shown in the leading badge. */
  itemCount: number;
  /** Running total shown next to the CTA. */
  total: number;
  /** CTA label, e.g. "View order" or "Go to checkout". */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Render fixed to the viewport bottom (mobile FAB). Defaults to true. */
  fixed?: boolean;
  className?: string;
}

/**
 * Sticky bottom action bar: item-count badge + running total + primary CTA.
 * Shared by the floating cart (storefront) and the checkout flow. Renders
 * nothing while the cart is empty.
 */
export function SummaryBar({
  itemCount,
  total,
  label,
  onClick,
  disabled,
  fixed = true,
  className,
}: SummaryBarProps) {
  if (itemCount <= 0) return null;

  return (
    <div
      className={cn(
        fixed &&
          "fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
        className
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-full border-2 border-bun-ink bg-bun-red px-5 py-3.5 text-white shadow-sticker-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-ink focus-visible:ring-offset-2"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white/40 bg-white/15 px-2 font-display text-sm font-bold">
            {itemCount}
          </span>
          <span className="font-display text-base font-bold">{label}</span>
        </span>
        <span className="font-display text-base font-bold tabular-nums">{formatRM(total)}</span>
      </button>
    </div>
  );
}
