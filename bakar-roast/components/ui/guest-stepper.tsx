"use client";

import { useEffect, useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Headcount stepper limited to the package's guest range.
 * Minus disables at `min`, plus at `max`. Typing an exact number is allowed; it is clamped on
 * blur or Enter, not per keystroke. When min/max change (a new package), the value is clamped
 * into the new range via onChange: say so in `help` ("The Feast serves 20 to 80 guests.").
 */
export function GuestStepper({
  value,
  onChange,
  min,
  max,
  step = 5,
  label = "How many guests?",
  help,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  /** null means no upper limit (CateringPackagePublic.maxGuests can be null). */
  max: number | null;
  step?: number;
  label?: string;
  help?: string;
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const upper = max ?? Number.POSITIVE_INFINITY;
  const clamp = (n: number) => Math.min(upper, Math.max(min, Math.round(n)));

  useEffect(() => setDraft(String(value)), [value]);

  // New range (package changed): pull the value inside it.
  useEffect(() => {
    if (value < min || value > upper) onChange(clamp(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max]);

  function commit() {
    const n = Number(draft);
    const next = Number.isFinite(n) && draft.trim() !== "" ? clamp(n) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  const btn =
    "grid h-11 w-11 place-items-center rounded-full bg-cream text-ink disabled:cursor-not-allowed disabled:bg-ink-line disabled:text-cream-faint";

  return (
    <div className={cn("grid justify-items-start gap-2", className)}>
      <label htmlFor={`${id}-input`} className="text-sm font-semibold">
        {label}
      </label>
      <div
        role="group"
        aria-label={label}
        className="inline-flex h-14 items-center gap-2 rounded-full border border-cream-faint bg-ink-raised p-[5px]"
      >
        <button
          type="button"
          className={btn}
          aria-label="Fewer guests"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
        >
          <Minus aria-hidden size={18} strokeWidth={2} />
        </button>
        <input
          id={`${id}-input`}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          aria-describedby={help ? `${id}-help` : undefined}
          className="h-11 w-[72px] rounded-full bg-transparent text-center text-xl font-bold text-cream focus:outline-none focus-visible:shadow-[0_0_0_3px_var(--tone-ring)]"
        />
        <button
          type="button"
          className={btn}
          aria-label="More guests"
          disabled={value >= upper}
          onClick={() => onChange(clamp(value + step))}
        >
          <Plus aria-hidden size={18} strokeWidth={2} />
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {value} guests
      </span>
      {help && (
        <p id={`${id}-help`} className="type-small m-0 text-cream-muted">
          {help}
        </p>
      )}
    </div>
  );
}
