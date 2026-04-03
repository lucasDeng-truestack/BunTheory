import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import {
  formatRelativeShort,
  orderTotal,
} from "@/lib/dashboard-metrics";
import type { Order, OrderStatus } from "@/types/order";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: OrderStatus) {
  switch (status) {
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-900";
    case "READY":
      return "bg-sky-100 text-sky-900";
    case "PREPARING":
      return "bg-amber-100 text-amber-900";
    case "RECEIVED":
    default:
      return "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80";
  }
}

type Props = {
  orders: Order[];
  limit?: number;
};

export function DashboardRecentActivity({ orders, limit = 6 }: Props) {
  const rows = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);

  return (
    <Card className="overflow-hidden border-charcoal/10 shadow-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-charcoal/10 bg-cream/30">
        <div>
          <CardTitle className="font-display text-lg text-charcoal lg:text-xl">
            Recent activity
          </CardTitle>
          <p className="mt-1 text-sm text-charcoal/65">
            Latest orders in this period.
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="font-display shrink-0 text-sm font-semibold text-roast-red underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red focus-visible:ring-offset-2"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-charcoal/60">
            No orders in this range yet.
          </p>
        ) : (
          <ul className="divide-y divide-charcoal/10">
            {rows.map((order) => {
              const total = orderTotal(order);
              const label =
                order.slugId ?? order.id.slice(0, 8).toUpperCase();
              const firstItem = order.orderItems[0];
              const title = firstItem?.menu?.name ?? "Order";
              return (
                <li key={order.id}>
                  <div className="flex gap-3 px-4 py-4 transition-colors hover:bg-cream/40 sm:gap-4 sm:px-6">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-roast-red/20 to-mustard/30 ring-1 ring-charcoal/10"
                      aria-hidden
                    >
                      <UtensilsCrossed className="h-6 w-6 text-roast-red/80" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-charcoal">{title}</p>
                        <Badge
                          className={cn(
                            "text-xs font-semibold",
                            statusBadgeClass(order.status)
                          )}
                        >
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-charcoal/60">
                        #{label} · {order.customerName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums text-charcoal">
                        RM {total.toFixed(2)}
                      </p>
                      <p className="text-xs text-charcoal/55">
                        {formatRelativeShort(order.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
