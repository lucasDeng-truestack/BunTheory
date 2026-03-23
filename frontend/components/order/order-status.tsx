import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "@/lib/constants";
import type { OrderStatus } from "@/types/order";
import { Check } from "lucide-react";

interface OrderStatusProps {
  status: OrderStatus;
}

export function OrderStatusDisplay({ status }: OrderStatusProps) {
  const currentIndex = ORDER_STATUS_STEPS.indexOf(status);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Order status</h3>
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
                      ? "bg-roast-red border-roast-red text-white"
                      : "border-charcoal/20 bg-white text-charcoal/50"
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium text-center ${
                    isCurrent ? "text-roast-red" : "text-charcoal/70"
                  }`}
                >
                  {ORDER_STATUS_LABELS[step]}
                </span>
              </div>
              {i < ORDER_STATUS_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${
                    isComplete ? "bg-roast-red" : "bg-charcoal/20"
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
