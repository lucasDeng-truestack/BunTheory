import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderCounterProps {
  current: number;
  max: number;
  canOrder?: boolean;
  /** e.g. "Thu 27 Mar" or batch label */
  batchLabel?: string | null;
}

export function OrderCounter({
  current,
  max,
  canOrder = true,
  batchLabel,
}: OrderCounterProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.round((current / safeMax) * 100));

  return (
    <div
      className={cn(
        "rounded-2xl border border-charcoal/10 bg-white p-4 shadow-card",
        !canOrder && "border-amber-200/80 bg-amber-50/50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-roast-red/10 text-roast-red">
            <Flame className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-charcoal/60">
              Kitchen load{batchLabel ? ` · ${batchLabel}` : ""}
            </p>
            <p className="text-xl font-bold tabular-nums text-charcoal">
              {current}
              <span className="text-base font-semibold text-charcoal/50"> / {max}</span>
            </p>
          </div>
        </div>
        {!canOrder && (
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
            Closed
          </span>
        )}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-charcoal/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            canOrder ? "bg-roast-red" : "bg-amber-600"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
