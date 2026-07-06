"use client";

import { Truck, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderType } from "@/types/order";

export interface FulfillmentHeaderProps {
  type: OrderType;
  /** Primary line: delivery address OR pickup outlet name. */
  title: string;
  /** Secondary line: delivery notes OR outlet address. */
  subtitle?: string | null;
  /** Prep/ETA minutes → "Delivery in N min" / "Pickup in N min". */
  etaMinutes?: number | null;
  /** When provided, shows a "Change" affordance (e.g. reopen the fulfillment gate). */
  onChange?: () => void;
  className?: string;
}

/** ETA copy derived from fulfillment type + configured prep time. */
export function fulfillmentEtaLabel(
  type: OrderType,
  etaMinutes?: number | null
): string | null {
  if (etaMinutes == null || etaMinutes <= 0) return null;
  return type === "DELIVERY"
    ? `Delivery in ${etaMinutes} min`
    : `Pickup in ${etaMinutes} min`;
}

/**
 * Sticky-style summary of the chosen fulfillment method shown above the menu,
 * cart and checkout. Mirrors the McDonald's-MY pattern: icon + where + ETA + Change.
 */
export function FulfillmentHeader({
  type,
  title,
  subtitle,
  etaMinutes,
  onChange,
  className,
}: FulfillmentHeaderProps) {
  const Icon = type === "DELIVERY" ? Truck : Store;
  const eta = fulfillmentEtaLabel(type, etaMinutes);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-3xl border-2 border-bun-ink bg-white p-4 shadow-sticker",
        className
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-bun-ink bg-bun-yellow text-bun-ink">
        <Icon className="h-5 w-5" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-bun-red-deep">
          {type === "DELIVERY" ? "Delivery" : "Pickup"}
          {eta ? <span className="text-bun-ink-soft"> · {eta}</span> : null}
        </p>
        <p className="truncate font-display font-bold text-bun-ink">{title}</p>
        {subtitle ? (
          <p className="truncate text-sm text-bun-ink-soft">{subtitle}</p>
        ) : null}
      </div>

      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 rounded-full border-2 border-bun-ink px-4 py-1.5 font-display text-sm font-semibold text-bun-ink transition-colors hover:bg-bun-ink hover:text-bun-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red focus-visible:ring-offset-2"
        >
          Change
        </button>
      ) : null}
    </div>
  );
}
