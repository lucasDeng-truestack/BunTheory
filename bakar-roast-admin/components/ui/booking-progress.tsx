import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const BOOKING_STEPS = ["Date", "Package", "Details", "Review"] as const;
export type BookingStep = 1 | 2 | 3 | 4;

/**
 * The four fixed booking steps with the back action above. Numbers are in the label so order
 * reads without colour. Current: ember bar, cream label, aria-current="step". Done: cream-muted.
 * Ahead: cream-faint on an ink-line bar.
 * Back: pass `backLabel` ("Back to date") plus `backHref` or `onBack`. Going back never clears answers.
 * Make it sticky under the header on phone from the page (it does not position itself).
 */
export function BookingProgress({
  current,
  backLabel,
  backHref,
  onBack,
  className,
}: {
  current: BookingStep;
  backLabel?: string;
  backHref?: string;
  onBack?: () => void;
  className?: string;
}) {
  const back = "inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-cream-muted hover:text-cream";
  const backContent = (
    <>
      <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
      {backLabel}
    </>
  );
  return (
    <div className={cn("grid gap-2", className)}>
      {backLabel &&
        (backHref ? (
          <Link href={backHref} className={cn(back, "w-fit")}>
            {backContent}
          </Link>
        ) : onBack ? (
          <button type="button" onClick={onBack} className={cn(back, "w-fit")}>
            {backContent}
          </button>
        ) : null)}
      <ol aria-label="Booking progress" className="m-0 flex list-none gap-2 p-0">
        {BOOKING_STEPS.map((name, i) => {
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
    </div>
  );
}
