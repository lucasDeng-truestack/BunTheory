import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DateRangeFilter } from "@/lib/dashboard-metrics";
import { topItems } from "@/lib/dashboard-metrics";
import type { Order } from "@/types/order";
import { ChefHat } from "lucide-react";

const RANGE_COPY: Record<DateRangeFilter, string> = {
  today: "Today",
  week: "This week",
  month: "Last 30 days",
  all: "All time",
};

type Props = {
  orders: Order[];
  range: DateRangeFilter;
};

export function DashboardTopItems({ orders, range }: Props) {
  const items = topItems(orders, 5);

  return (
    <Card className="overflow-hidden border-charcoal/10 shadow-card">
      <CardHeader className="border-b border-charcoal/10 bg-cream/30">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="font-display text-lg text-charcoal lg:text-xl">
              Top items
            </CardTitle>
            <p className="mt-1 text-sm text-charcoal/65">
              By quantity · {RANGE_COPY[range]}
            </p>
          </div>
          <ChefHat className="h-6 w-6 shrink-0 text-roast-red/70" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-charcoal/60">
            No line items in this range.
          </p>
        ) : (
          <ul className="divide-y divide-charcoal/10">
            {items.map((row, i) => (
              <li key={row.menuId}>
                <div className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-cream/40 sm:px-6">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cream text-sm font-bold text-roast-red ring-1 ring-charcoal/10"
                    aria-hidden
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-charcoal">
                      {row.name}
                    </p>
                    <p className="text-sm text-charcoal/60">
                      {row.qty} sold
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-charcoal/10 px-4 py-3 sm:px-6">
          <Link
            href="/admin/orders"
            className="font-display text-sm font-semibold text-roast-red underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red focus-visible:ring-offset-2"
          >
            Open orders for filters
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
