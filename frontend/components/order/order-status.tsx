import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "@/lib/constants";
import type { OrderStatus } from "@/types/order";
import { Check } from "lucide-react";

interface OrderStatusProps {
  status: OrderStatus;
}

export function OrderStatusDisplay({ status }: OrderStatusProps) {
  // ORDER_STATUS_STEPS is the legacy 4-step path; statuses outside it (the new
  // KDS states) resolve to -1 until the type-aware stepper lands in a later phase.
  const currentIndex = (ORDER_STATUS_STEPS as readonly OrderStatus[]).indexOf(
    status
  );

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-bold text-bun-ink">Order status</h3>
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-[min(100%,520px)] items-center justify-between gap-2 px-1">
        {ORDER_STATUS_STEPS.map((step, i) => {
          const isComplete = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    isComplete
                      ? "bg-bun-red border-bun-ink text-white"
                      : "border-bun-ink/25 bg-white text-bun-ink/50"
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <span className="font-display text-sm font-bold">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-center font-display text-sm font-semibold ${
                    isCurrent ? "text-bun-red" : "text-bun-ink-soft"
                  }`}
                >
                  {ORDER_STATUS_LABELS[step]}
                </span>
              </div>
              {i < ORDER_STATUS_STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 rounded-full ${
                    isComplete ? "bg-bun-red" : "bg-bun-ink/15"
                  }`}
                />
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
