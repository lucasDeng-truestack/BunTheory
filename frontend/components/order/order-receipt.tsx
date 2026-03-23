import type { Order } from "@/types/order";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function unitPrice(oi: Order["orderItems"][number]): number | null {
  if (oi.menu?.price == null) return null;
  const n = Number(oi.menu.price);
  return Number.isFinite(n) ? n : null;
}

function lineTotal(oi: Order["orderItems"][number]): number | null {
  const u = unitPrice(oi);
  if (u == null) return null;
  return u * oi.quantity;
}

export function OrderReceipt({ order }: { order: Order }) {
  const totals = order.orderItems.map((oi) => lineTotal(oi));
  const hasAllPrices = totals.every((t) => t != null);
  const grandTotal = hasAllPrices
    ? totals.reduce((sum, t) => sum + (t as number), 0)
    : null;

  return (
    <Card className="mx-auto mt-8 max-w-md text-left shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight">
          Your order
        </CardTitle>
        <p className="text-sm text-charcoal/60">
          {order.type === "DELIVERY" ? "Delivery" : "Pickup"} ·{" "}
          {order.customerName}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <ul className="space-y-3">
          {order.orderItems.map((oi) => {
            const name = oi.menu?.name ?? "Item";
            const unit = unitPrice(oi);
            const line = lineTotal(oi);
            return (
              <li
                key={oi.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="font-medium text-charcoal">
                  <span className="text-roast-red">{oi.quantity}×</span> {name}
                </span>
                <span className="font-medium text-charcoal tabular-nums">
                  {line != null
                    ? `RM ${line.toFixed(2)}`
                    : unit != null
                      ? `RM ${(unit * oi.quantity).toFixed(2)}`
                      : "—"}
                </span>
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
