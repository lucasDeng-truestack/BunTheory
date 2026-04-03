import type { Order } from "@/types/order";
import { OrderLineItemExtras } from "@/components/order/order-line-item-extras";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function lineName(oi: Order["orderItems"][number]): string {
  return oi.menu?.name ?? "Item";
}

function unitPrice(oi: Order["orderItems"][number]): number | null {
  const raw = oi.unitPrice ?? oi.menu?.price;
  if (raw == null) return null;
  const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function lineTotal(oi: Order["orderItems"][number]): number | null {
  const u = unitPrice(oi);
  if (u == null) return null;
  return u * oi.quantity;
}

export function OrderReceipt({
  order,
  title = "Your order",
}: {
  order: Order;
  /** Defaults to customer-facing copy; admin can pass e.g. "Line items". */
  title?: string;
}) {
  const totals = order.orderItems.map((oi) => lineTotal(oi));
  const hasAllPrices = totals.every((t) => t != null);
  const grandTotal = hasAllPrices
    ? totals.reduce((sum, t) => sum + (t as number), 0)
    : null;

  return (
    <Card className="mx-auto w-full max-w-md text-left shadow-card lg:mx-0 lg:max-w-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight">
          {title}
        </CardTitle>
        <p className="text-sm text-charcoal/60">
          {order.type === "DELIVERY" ? "Delivery" : "Pickup"} ·{" "}
          {order.customerName}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <ul className="space-y-4">
          {order.orderItems.map((oi) => {
            const name = lineName(oi);
            const unit = unitPrice(oi);
            const line = lineTotal(oi);
            return (
              <li
                key={oi.id}
                className="border-b border-charcoal/10 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-charcoal">
                      <span className="text-roast-red">{oi.quantity}×</span>{" "}
                      {name}
                    </span>
                    <OrderLineItemExtras oi={oi} className="mt-1.5" />
                  </div>
                  <span className="shrink-0 font-medium text-charcoal tabular-nums">
                    {line != null
                      ? `RM ${line.toFixed(2)}`
                      : unit != null
                        ? `RM ${(unit * oi.quantity).toFixed(2)}`
                        : "—"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        {grandTotal != null && (
          <>
            <div className="border-t border-charcoal/10" role="presentation" />
            <div className="flex items-center justify-between pt-1 text-base font-semibold text-charcoal">
              <span>Total</span>
              <span className="text-roast-red tabular-nums">
                RM {grandTotal.toFixed(2)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
