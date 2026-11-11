"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorMark } from "@/components/ui/banner";

/**
 * Form fields: label above, control, then help or error.
 * - Fill ink-raised with a 1px cream-faint border (the border is what makes it visible).
 * - Focus: ember border + 3px ring (ink ring on cream bands).
 * - Invalid (`error` set): 2px heat border, aria-invalid, "!" mark and the message in cream,
 *   linked with aria-describedby. Help stays linked too.
 * - `optional` adds "(optional)" to the label. Required fields are not starred.
 * - size "md" 56px (public), "sm" 44px with 14px text (admin).
 * All native props and refs pass through. Give the right type, inputMode and autoComplete.
 */

type FieldSize = "md" | "sm";

type ShellProps = {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  size?: FieldSize;
  className?: string;
};

function controlClass(size: FieldSize, invalid: boolean, extra?: string) {
  return cn(
    "w-full rounded-card-sm border border-cream-faint bg-ink-raised text-cream placeholder:text-cream-faint",
    "transition-[border-color,box-shadow] duration-200 focus:border-ember focus:shadow-[0_0_0_3px_var(--tone-ring)] focus:outline-none focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:border-ink-line disabled:text-cream-faint",
    size === "md" ? "px-[18px] text-base" : "px-3.5 text-sm",
    invalid && "border-2 border-ember-heat focus:border-ember-heat",
    extra,
  );
}

function useFieldIds(id?: string) {
  const auto = useId();
  const base = id ?? auto;
  return { id: base, helpId: `${base}-help`, errorId: `${base}-error` };
}

function Shell({
  ids,
  label,
  help,
  error,
  optional,
  size = "md",
  className,
  children,
}: ShellProps & { ids: ReturnType<typeof useFieldIds>; children: ReactNode }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={ids.id} className={cn("font-semibold text-cream", size === "md" ? "text-sm" : "text-[13px]")}>
        {label}
        {optional && <span className="font-normal text-cream-faint"> (optional)</span>}
      </label>
      {children}
      {help && !error && (
        <p id={ids.helpId} className="type-small m-0 text-cream-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={ids.errorId} className="type-small m-0 flex items-center gap-2 text-cream">
          <ErrorMark />
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(ids: ReturnType<typeof useFieldIds>, help: ReactNode, error: ReactNode, own?: string) {
  return cn(own, error ? ids.errorId : help ? ids.helpId : undefined) || undefined;
}

export type FieldProps = ShellProps & Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, help, error, optional, size = "md", className, id, ...input },
  ref,
) {
  const ids = useFieldIds(id);
  return (
    <Shell ids={ids} label={label} help={help} error={error} optional={optional} size={size} className={className}>
      <input
        ref={ref}
        id={ids.id}
        aria-invalid={error ? true : undefined}
        {...input}
        aria-describedby={describedBy(ids, help, error, input["aria-describedby"])}
        className={controlClass(size, !!error, size === "md" ? "h-14" : "h-11")}
      />
    </Shell>
  );
});

export type TextareaFieldProps = ShellProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, help, error, optional, size = "md", className, id, ...textarea },
  ref,
) {
  const ids = useFieldIds(id);
  return (
    <Shell ids={ids} label={label} help={help} error={error} optional={optional} size={size} className={className}>
      <textarea
        ref={ref}
        id={ids.id}
        aria-invalid={error ? true : undefined}
        {...textarea}
        aria-describedby={describedBy(ids, help, error, textarea["aria-describedby"])}
        className={controlClass(size, !!error, cn("resize-y py-4", size === "md" ? "min-h-28" : "min-h-20 py-3"))}
      />
    </Shell>
  );
});

export type SelectFieldProps = ShellProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">;

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, help, error, optional, size = "md", className, id, children, ...select },
  ref,
) {
  const ids = useFieldIds(id);
  return (
    <Shell ids={ids} label={label} help={help} error={error} optional={optional} size={size} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={ids.id}
          aria-invalid={error ? true : undefined}
          {...select}
          aria-describedby={describedBy(ids, help, error, select["aria-describedby"])}
          className={controlClass(size, !!error, cn("appearance-none pr-12", size === "md" ? "h-14" : "h-11"))}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute right-[18px] top-1/2 -translate-y-1/2 text-cream-muted"
        />
      </div>
    </Shell>
  );
});
