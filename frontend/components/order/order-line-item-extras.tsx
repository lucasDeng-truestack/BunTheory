import type { OrderItem } from "@/types/order";
import { getSelectedOptionLines } from "@/lib/order-item-display";
import { cn } from "@/lib/utils";

type OrderLineItemExtrasProps = {
  oi: OrderItem;
  className?: string;
};

/** Selected options + remarks under a line item (shared receipt / table / track). */
export function OrderLineItemExtras({ oi, className }: OrderLineItemExtrasProps) {
  const lines = getSelectedOptionLines(oi);
  const remarks = oi.remarks?.trim();
  if (lines.length === 0 && !remarks) return null;

  return (
    <div
      className={cn(
        "space-y-1 text-sm leading-snug text-charcoal/70",
        className
      )}
    >
      {lines.map((line, i) => (
        <p key={i} className="pl-0">
          <span className="text-charcoal/45" aria-hidden>
            ·{" "}
          </span>
          {line}
        </p>
      ))}
      {remarks ? (
        <p className="text-charcoal/65">
          <span className="font-medium text-charcoal/80">Note:</span> {remarks}
        </p>
      ) : null}
    </div>
  );
}
