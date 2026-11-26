import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin on/off switch: a real checkbox with role="switch". The whole label is the 44px target.
 * The value word ("Yes"/"No", "Shown"/"Hidden") is shown beside it with CSS, so it works
 * controlled (checked + onChange) or uncontrolled (defaultChecked). Admin only.
 * Saving: flip, save, confirm with an ok Banner or "Saved"; on failure flip back and show an error Banner.
 */
export const Toggle = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> & {
    label: ReactNode;
    onText?: string;
    offText?: string;
  }
>(function Toggle({ label, onText = "Yes", offText = "No", className, ...input }, ref) {
  return (
    <label
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-cream has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
        className,
      )}
    >
      <input ref={ref} type="checkbox" role="switch" className="peer sr-only" {...input} />
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 flex-none rounded-full border-[1.5px] border-cream-faint transition-colors",
          "after:absolute after:left-[3px] after:top-[3px] after:h-[19px] after:w-[19px] after:rounded-full after:bg-cream-faint after:transition-transform after:duration-200",
          "peer-checked:border-ember peer-checked:bg-ember peer-checked:after:translate-x-5 peer-checked:after:bg-ink",
          "peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-tone-ring",
        )}
      />
      {label}
      <span aria-hidden className="font-normal text-cream-muted peer-checked:hidden">
        {offText}
      </span>
      <span aria-hidden className="hidden font-normal text-cream-muted peer-checked:inline">
        {onText}
      </span>
    </label>
  );
});
