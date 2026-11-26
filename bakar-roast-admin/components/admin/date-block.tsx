import { formatLong, parseYmd } from "@/lib/dates";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Weekday, day number in the display face, month. Use it wherever a booking is listed.
 * The full date in words is read out instead of the three parts. `lg` is the detail header.
 */
export function DateBlock({ ymd, size = "md", className }: { ymd: string; size?: "md" | "lg"; className?: string }) {
  const d = parseYmd(ymd);
  return (
    <span
      className={cn(
        "grid flex-none content-center justify-items-center rounded-[14px] bg-ink leading-none shadow-[inset_0_0_0_1px_theme(colors.ink.line)]",
        size === "lg" ? "h-[76px] w-[68px]" : "h-16 w-14",
        className,
      )}
    >
      <span className="sr-only">{formatLong(ymd)}</span>
      <small aria-hidden className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cream-muted">
        {DAYS[d.getUTCDay()]}
      </small>
      <b
        aria-hidden
        className={cn(
          "font-display font-extrabold leading-[0.9] [font-stretch:80%]",
          size === "lg" ? "text-[34px]" : "text-[28px]",
        )}
      >
        {d.getUTCDate()}
      </b>
      <small aria-hidden className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cream-muted">
        {MONTHS[d.getUTCMonth()]}
      </small>
    </span>
  );
}
