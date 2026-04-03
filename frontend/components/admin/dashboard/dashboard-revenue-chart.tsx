"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildRevenueBuckets,
  type DateRangeFilter,
} from "@/lib/dashboard-metrics";
import type { Order } from "@/types/order";
import { DashboardTimeRangeSelect } from "./dashboard-time-range-select";
import { cn } from "@/lib/utils";

type Props = {
  orders: Order[];
  range: DateRangeFilter;
  onRangeChange: (v: DateRangeFilter) => void;
};

export function DashboardRevenueChart({
  orders,
  range,
  onRangeChange,
}: Props) {
  const buckets = buildRevenueBuckets(orders, range);
  const max = Math.max(...buckets.map((b) => b.total), 1);

  return (
    <Card className="overflow-hidden border-charcoal/10 shadow-card">
      <CardHeader className="flex flex-col gap-4 border-b border-charcoal/10 bg-cream/30 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="font-display text-lg text-charcoal lg:text-xl">
            Revenue
          </CardTitle>
          <p className="mt-1 text-sm text-charcoal/65">
            Estimated from line totals in the selected period.
          </p>
        </div>
        <DashboardTimeRangeSelect value={range} onChange={onRangeChange} />
      </CardHeader>
      <CardContent className="pt-6">
        {buckets.length === 0 ? (
          <p className="py-12 text-center text-sm text-charcoal/60">
            No orders in this range yet — nothing to chart.
          </p>
        ) : (
        <div
          className="flex h-[220px] items-end justify-between gap-1.5 sm:gap-2"
          role="img"
          aria-label="Revenue by period"
        >
          {buckets.map((b) => {
            const h = max > 0 ? Math.round((b.total / max) * 100) : 0;
            const barH = Math.max(h, b.total > 0 ? 8 : 4);
            return (
              <div
                key={b.key}
                className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="sr-only">
                  {b.label}: RM {b.total.toFixed(2)}
                </span>
                <div className="relative flex h-[180px] w-full max-w-[3rem] flex-col justify-end">
                  <div
                    className={cn(
                      "w-full min-h-[4px] rounded-t-lg transition-all",
                      b.highlight
                        ? "bg-gradient-to-t from-burnt-brown to-roast-red shadow-sm"
                        : "bg-roast-red/35 group-hover:bg-roast-red/55"
                    )}
                    style={{ height: `${barH}%` }}
                  />
                  <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-charcoal/10 bg-white px-2 py-1 text-xs font-medium text-charcoal shadow-card opacity-0 transition group-hover:opacity-100">
                    RM {b.total.toFixed(2)}
                  </span>
                </div>
                <span className="max-w-full truncate text-center text-[10px] text-charcoal/55 sm:text-xs">
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>
        )}
        <p className="mt-4 text-center text-xs text-charcoal/50">
          Tip: hover bars on desktop to read amounts. Totals use item prices from
          each order.
        </p>
      </CardContent>
    </Card>
  );
}
