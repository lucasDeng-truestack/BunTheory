import { cn } from "@/lib/utils";

export const ORDER_STEPS = ["Menu", "Your details", "Payment"] as const;
export type OrderStep = 1 | 2 | 3;

/**
 * The three steps of ordering, shown on the order page (menu, details) and on the saved order
 * until it is paid. Same look as ui/booking-progress: numbers in the label so the order reads
 * without colour, an ember bar and aria-current on the current step.
 */
export function OrderSteps({ current, className }: { current: OrderStep; className?: string }) {
  return (
    <ol aria-label="Order progress" className={cn("m-0 flex list-none gap-2 p-0", className)}>
      {ORDER_STEPS.map((name, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "ahead";
        return (
          <li
            key={name}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "grid flex-1 gap-2 text-[13px] font-semibold transition-colors duration-300",
              state === "done" && "text-cream-muted",
              state === "current" && "text-cream",
              state === "ahead" && "text-cream-faint",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-1 rounded-sm",
                state === "done" && "bg-cream-muted",
                state === "current" && "bg-ember",
                state === "ahead" && "bg-ink-line",
              )}
            />
            <span>
              {n}. {name}
              {state === "done" && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
