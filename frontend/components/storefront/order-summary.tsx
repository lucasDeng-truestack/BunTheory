"use client";

import { cn } from "@/lib/utils";
import { formatRM } from "@/lib/money";
import type { OrderTotals } from "@/lib/order-totals";

export interface OrderSummaryProps {
  totals: OrderTotals;
  className?: string;
}

function Row({
  label,
  value,
  muted,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className={muted ? "text-bun-ink-soft/70" : "text-bun-ink-soft"}>
        {label}
      </span>
      <span className={muted ? "text-bun-ink-soft/70" : "text-bun-ink"}>
        {value}
      </span>
    </div>
  );
}

/**
 * Order money breakdown: Subtotal, fees, tax-included line, and the grand total.
 * Fee rows only appear when non-zero. Tax is shown as "Included" because SST is
 * baked into the total (see {@link computeOrderTotals}).
 */
export function OrderSummary({ totals, className }: OrderSummaryProps) {
  const { subtotal, deliveryFee, processingFee, taxRatePercent, taxAmount, total } =
    totals;

  return (
    <div
      className={cn(
        "space-y-2 rounded-3xl border-2 border-bun-ink bg-white p-5 shadow-sticker",
        className
      )}
    >
      <Row label="Subtotal" value={formatRM(subtotal)} />

      {deliveryFee > 0 ? (
        <Row label="Delivery fee" value={formatRM(deliveryFee)} />
      ) : null}
      {processingFee > 0 ? (
        <Row label="Processing fee" value={formatRM(processingFee)} />
      ) : null}

      {taxRatePercent > 0 ? (
        <Row
          muted
          label={`Tax (Included) ${taxRatePercent}%`}
          value={formatRM(taxAmount)}
        />
      ) : null}

      <div className="mt-1 flex items-baseline justify-between gap-4 border-t-2 border-bun-ink/10 pt-3">
        <span className="font-display font-bold text-bun-ink">
          Total
          {taxRatePercent > 0 ? (
            <span className="ml-1 text-xs font-normal text-bun-ink-soft/60">
              (incl. tax)
            </span>
          ) : null}
        </span>
        <span className="font-display text-xl font-bold text-bun-red">
          {formatRM(total)}
        </span>
      </div>
    </div>
  );
}
