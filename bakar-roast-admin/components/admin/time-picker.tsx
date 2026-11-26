"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { timeLabel } from "@/lib/shop";
import { cn } from "@/lib/utils";

const HALF_DAY = (pm: boolean) =>
  Array.from({ length: 24 }, (_, i) => {
    const h = String((pm ? 12 : 0) + Math.floor(i / 2)).padStart(2, "0");
    return `${h}:${i % 2 ? "30" : "00"}`;
  });

/**
 * Pick a time on the half hour. Instead of a native list of 48 rows, it opens a small panel: a
 * morning / afternoon switch and that half of the day as a grid of buttons, so every choice is
 * visible without scrolling. `usualLabel` adds a "use the usual time" choice (value "").
 * Closes on a pick, on Escape, or on a press outside. Admin only.
 */
export function TimePicker({
  label,
  value,
  onChange,
  usualLabel,
  error,
}: {
  label: string;
  /** "HH:mm", or "" for the usual time when `usualLabel` is set. */
  value: string;
  onChange: (value: string) => void;
  usualLabel?: string;
  error?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pm, setPm] = useState(() => (value ? value >= "12:00" : true));
  const panel = useRef<HTMLDivElement>(null);
  // Opens below the field, or above it when the panel would run off the bottom of the screen.
  const [above, setAbove] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    const t = trigger.current?.getBoundingClientRect();
    const height = panel.current?.offsetHeight ?? 0;
    if (!t) return;
    const below = window.innerHeight - t.bottom;
    setAbove(below < height + 16 && t.top > below);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    trigger.current?.focus();
  };

  const half = "min-h-10 flex-1 rounded-full text-sm font-semibold transition-colors";

  return (
    <div ref={root} className="relative grid gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-cream">
        {label}
      </label>
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          // Open on the half of the day the current value is in.
          if (!open && value) setPm(value >= "12:00");
          setOpen((o) => !o);
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-card-sm border bg-ink-raised px-3.5 text-left text-sm text-cream",
          "transition-[border-color,box-shadow] duration-200 focus:outline-none focus-visible:border-ember focus-visible:shadow-[0_0_0_3px_var(--tone-ring)]",
          error ? "border-2 border-ember-heat" : open ? "border-ember" : "border-cream-faint",
        )}
      >
        <span>{value ? timeLabel(value) : (usualLabel ?? "Choose a time")}</span>
        <ChevronDown
          aria-hidden
          size={16}
          strokeWidth={1.75}
          className={cn("text-cream-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {error && <p className="type-small m-0 text-cream">{error}</p>}

      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label={label}
          className={cn(
            "absolute left-0 z-40 grid w-[min(320px,calc(100vw-48px))] gap-3 rounded-card-sm border border-cream-faint bg-ink p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
            above ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {usualLabel && (
            <button
              type="button"
              onClick={() => pick("")}
              aria-pressed={value === ""}
              className={cn(
                "min-h-10 rounded-card-sm border px-3 text-left text-sm font-semibold transition-colors",
                value === "" ? "border-ember bg-ember text-ink" : "border-cream-faint text-cream hover:border-cream",
              )}
            >
              {usualLabel}
            </button>
          )}
          <div className="flex gap-1 rounded-full border border-ink-line p-1">
            <button
              type="button"
              aria-pressed={!pm}
              onClick={() => setPm(false)}
              className={cn(half, !pm ? "bg-cream text-ink" : "text-cream-muted hover:text-cream")}
            >
              Morning
            </button>
            <button
              type="button"
              aria-pressed={pm}
              onClick={() => setPm(true)}
              className={cn(half, pm ? "bg-cream text-ink" : "text-cream-muted hover:text-cream")}
            >
              Afternoon
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {HALF_DAY(pm).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => pick(t)}
                aria-pressed={value === t}
                className={cn(
                  "min-h-10 rounded-card-sm text-[13px] font-semibold tabular-nums transition-colors",
                  value === t
                    ? "bg-ember text-ink"
                    : "bg-ink-raised text-cream hover:shadow-[inset_0_0_0_1px_theme(colors.cream.DEFAULT)]",
                )}
              >
                {timeLabel(t)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
