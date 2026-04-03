"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumber,
} from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FLAG_URL =
  "https://purecatamphetamine.github.io/country-flag-icons/3x2/{XX}.svg";

type PhoneDisplayReadonlyProps = {
  /** E.164 or stored value from settings */
  value: string;
  /** Small label above the row (reference: “Contact number”) */
  label: string;
  /** Shown when `value` is empty or whitespace */
  emptyContent: React.ReactNode;
  className?: string;
};

export function PhoneDisplayReadonly({
  value,
  label,
  emptyContent,
  className,
}: PhoneDisplayReadonlyProps) {
  const trimmed = value.trim();

  const parsed =
    trimmed && isValidPhoneNumber(trimmed)
      ? parsePhoneNumber(trimmed)
      : undefined;

  const country = parsed?.country as Country | undefined;
  const displayText = parsed
    ? formatPhoneNumber(trimmed)
    : trimmed || null;

  const copy = useCallback(async () => {
    if (!trimmed) return;
    try {
      await navigator.clipboard.writeText(trimmed);
      toast.success("Phone number copied");
    } catch {
      toast.error("Could not copy");
    }
  }, [trimmed]);

  if (!trimmed) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <p className="text-xs text-charcoal/55">{label}</p>
        <div className="text-sm text-charcoal/60">{emptyContent}</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs text-charcoal/55">{label}</p>
      <div className="flex max-w-md items-center gap-2">
        <div
          className="flex h-12 min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-charcoal/20 bg-white px-3 shadow-sm"
          role="group"
          aria-label={label}
        >
          {country ? (
            // eslint-disable-next-line @next/next/no-img-element -- external flag CDN (same as react-phone-number-input)
            <img
              src={FLAG_URL.replace("{XX}", country)}
              alt=""
              width={28}
              height={20}
              className="h-5 w-7 shrink-0 rounded-sm object-cover"
            />
          ) : null}
          <span className="min-w-0 truncate text-base font-semibold text-charcoal">
            {displayText ?? trimmed}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-12 w-12 shrink-0 text-charcoal/45 hover:text-charcoal"
          aria-label="Copy phone number"
          onClick={() => void copy()}
        >
          <Copy className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}
