import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Selectable option pill (min 44px). Selected fills cream with ink text and heavier weight,
 * so the choice never depends on colour alone.
 * - Filter/toggle: <Pill selected onClick> sets aria-pressed.
 * - Single choice: put pills in a role="radiogroup" and pass mode="radio" (sets role="radio" + aria-checked).
 * Let pills wrap (flex-wrap) on phone; never scroll sideways inside a form.
 */
export const Pill = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; mode?: "toggle" | "radio" }
>(function Pill({ selected = false, mode = "toggle", className, type = "button", ...rest }, ref) {
  const state =
    mode === "radio" ? { role: "radio", "aria-checked": selected } : { "aria-pressed": selected };
  return (
    <button
      ref={ref}
      type={type}
      {...state}
      {...rest}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-medium leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-cream bg-cream font-semibold text-ink"
          : "border-cream-faint bg-transparent text-cream hover:border-cream",
        className,
      )}
    />
  );
});

/** Non-interactive chip, e.g. "Now booking" on the hero photo. `cream` for the date chip. */
export function Chip({
  children,
  tone = "ink",
  className,
}: {
  children: ReactNode;
  tone?: "ink" | "cream";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold leading-none",
        tone === "ink" ? "bg-ink text-cream" : "bg-cream text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("h-2 w-2 rounded-full", tone === "ink" ? "bg-ember" : "bg-ember-heat")}
      />
      {children}
    </span>
  );
}
