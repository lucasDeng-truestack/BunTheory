"use client";

import { useId, type ReactNode } from "react";
import PhoneInput, { parsePhoneNumber, isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";
import { ErrorMark } from "@/components/ui/banner";

/**
 * A phone number field: country flag picker (Malaysia first) and the number, built on
 * react-phone-number-input. Malaysian numbers are typed the usual way ("011-7512 6433"). Looks and behaves like `Field` (label above, help or error under,
 * "md" 56px public / "sm" 44px admin). The value is E.164 ("+60117512643"), or "" when empty.
 * No placeholder: an empty field shows empty. Stored numbers typed the local way
 * ("0117512643") are read as Malaysian, so older saved details still fill in.
 */
export function PhoneField({
  label,
  help,
  error,
  optional,
  size = "md",
  className,
  id,
  value,
  onChange,
  onBlur,
  autoComplete = "tel",
  disabled,
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  size?: "md" | "sm";
  className?: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const auto = useId();
  const base = id ?? auto;
  const helpId = `${base}-help`;
  const errorId = `${base}-error`;
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={base} className={cn("font-semibold text-cream", size === "md" ? "text-sm" : "text-[13px]")}>
        {label}
        {optional && <span className="font-normal text-cream-faint"> (optional)</span>}
      </label>
      <PhoneInput
        id={base}
        defaultCountry="MY"
        limitMaxLength
        // A value already in "+…" form is the library's own (possibly half typed): pass it
        // through untouched, or the field resets mid-edit. Only older local numbers are converted.
        value={value.startsWith("+") ? value : toE164(value)}
        onChange={(v) => onChange(v ?? "")}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : help ? helpId : undefined}
        numberInputProps={{ autoComplete }}
        className={cn(
          "phone-field flex w-full items-center gap-3 rounded-card-sm border border-cream-faint bg-ink-raised text-cream",
          "transition-[border-color,box-shadow] duration-200 focus-within:border-ember focus-within:shadow-[0_0_0_3px_var(--tone-ring)]",
          size === "md" ? "h-14 px-[18px] text-base" : "h-11 px-3.5 text-sm",
          error && "border-2 border-ember-heat focus-within:border-ember-heat",
          disabled && "cursor-not-allowed border-ink-line text-cream-faint",
        )}
      />
      {help && !error && (
        <p id={helpId} className="type-small m-0 text-cream-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="type-small m-0 flex items-center gap-2 text-cream">
          <ErrorMark />
          {error}
        </p>
      )}
    </div>
  );
}

/** "+60117512643" stays; "0117512643" or "60117512643" become E.164; anything unreadable is dropped. */
export function toE164(raw: string | null | undefined): string | undefined {
  const v = (raw ?? "").trim();
  if (!v) return undefined;
  try {
    if (v.startsWith("+")) return parsePhoneNumber(v)?.number ?? undefined;
    const digits = v.replace(/\D/g, "");
    if (digits.startsWith("60")) return parsePhoneNumber(`+${digits}`)?.number ?? undefined;
    return parsePhoneNumber(digits, "MY")?.number ?? undefined;
  } catch {
    return undefined;
  }
}

export { isValidPhoneNumber };
