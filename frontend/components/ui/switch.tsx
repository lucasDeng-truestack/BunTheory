"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      ref={ref}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-roast-red" : "bg-charcoal/25",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-1 top-1 block h-6 w-6 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-out",
          checked && "translate-x-6"
        )}
        aria-hidden
      />
    </button>
  )
);
Switch.displayName = "Switch";

export { Switch };
