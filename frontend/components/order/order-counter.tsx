import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderCounterProps {
  current: number;
  max: number;
  canOrder?: boolean;
  /** e.g. "Thu 27 Mar" or batch label */
  batchLabel?: string | null;
  /** Dark surface (on the menu hero) vs light card. */
  tone?: "light" | "dark";
}

/**
 * Batch capacity meter ("kitchen load"): how many of the batch's item slots are
 * taken. Purely presentational — values come from the live `can-order` context.
 */
export function OrderCounter({
  current,
  max,
  canOrder = true,
  batchLabel,
  tone = "light",
}: OrderCounterProps) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.round((current / safeMax) * 100));
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-4",
        dark
          ? "border-bun-cream/15 bg-white/5 text-bun-cream"
          : "border-bun-ink bg-white text-bun-ink shadow-sticker"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border-2",
              dark ? "border-bun-cream/20 bg-bun-red text-white" : "border-bun-ink bg-bun-yellow text-bun-ink"
            )}
          >
            <Flame className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p
              className={cn(
                "font-display text-[0.7rem] font-semibold uppercase tracking-[0.14em]",
                dark ? "text-bun-yellow" : "text-bun-ink-soft"
              )}
            >
              Kitchen load{batchLabel ? ` · ${batchLabel}` : ""}
            </p>
            <p className="font-display text-xl font-bold tabular-nums">
              {current}
              <span className={cn("text-base font-semibold", dark ? "text-bun-cream/50" : "text-bun-ink-soft/60")}>
                {" "}
                / {max}
              </span>
            </p>
          </div>
        </div>
        {!canOrder && (
          <span className="shrink-0 rounded-full border-2 border-bun-ink bg-bun-yellow px-3 py-1 font-display text-xs font-bold uppercase text-bun-ink">
            Closed
          </span>
        )}
      </div>
      <div className={cn("mt-3 h-2.5 overflow-hidden rounded-full", dark ? "bg-bun-cream/15" : "bg-bun-ink/10")}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", canOrder ? "bg-bun-red" : "bg-bun-yellow")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
