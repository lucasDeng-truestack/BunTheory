"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { CateringAvailability } from "@/lib/api";
import { addDaysYmd, buildMonthGrid, formatLong, formatMonthYear, monthOf, parseYmd, type GridDay } from "@/lib/dates";
import { classifyDay, DAY_STATE_LABEL, isPickable, type DayState } from "@/lib/booking";
import { bookingCopy } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/banner";

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DOW_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ─── Shared shell (customer and admin) ───────────────────────────────────────

/** Base look of every day cell: at least 44px, square, 16px radius, centred number. */
export const dayCell =
  "relative grid aspect-square min-h-11 w-full place-items-center rounded-card-sm p-0 text-[15px] font-medium text-cream-faint";

/**
 * The month frame: title with previous and next buttons, a grid slot, a legend slot and a
 * footer slot. Knows nothing about day states, so the admin calendar can reuse it.
 */
export function CalendarShell({
  title,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  nextRef,
  prevRef,
  children,
  legend,
  footer,
  busy = false,
  className,
}: {
  title: ReactNode;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  nextRef?: React.Ref<HTMLButtonElement>;
  prevRef?: React.Ref<HTMLButtonElement>;
  children: ReactNode;
  legend?: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  className?: string;
}) {
  const nav =
    "grid h-11 w-11 flex-none place-items-center rounded-full border border-cream-faint text-cream transition-colors hover:border-cream disabled:cursor-not-allowed disabled:border-ink-line disabled:text-cream-faint";
  return (
    <div aria-busy={busy || undefined} className={cn("w-full max-w-[520px] rounded-card-md bg-ink-soft p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button ref={prevRef} type="button" className={nav} onClick={onPrev} disabled={prevDisabled} aria-label="Previous month">
          <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
        </button>
        <div aria-live="polite" className="font-display text-[28px] font-extrabold uppercase leading-none [font-stretch:80%]">
          {title}
        </div>
        <button ref={nextRef} type="button" className={nav} onClick={onNext} disabled={nextDisabled} aria-label="Next month">
          <ArrowRight aria-hidden size={16} strokeWidth={1.75} />
        </button>
      </div>
      {children}
      {legend && (
        <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-[13px] text-cream-muted">{legend}</ul>
      )}
      {footer}
    </div>
  );
}

/** One legend entry: a 24px swatch carrying the day look, then the label. */
export function LegendItem({ look, children }: { look: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={cn("relative block h-6 w-6 flex-none rounded-lg", look)} />
      {children}
    </li>
  );
}

/**
 * The 7-column month grid (Monday first) with ARIA grid roles. `renderDay` draws each in-month
 * cell; other-month days render at 40% and are not interactive.
 */
export function MonthGrid({
  year,
  month,
  renderDay,
  onKeyDown,
  className,
}: {
  year: number;
  month: number;
  renderDay: (day: GridDay) => ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
}) {
  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);
  return (
    <div role="grid" aria-label={formatMonthYear(year, month)} onKeyDown={onKeyDown} className={cn("grid gap-0.5 sm:gap-1", className)}>
      <div role="row" className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {DOW.map((d, i) => (
          <div
            key={d}
            role="columnheader"
            aria-label={DOW_LONG[i]}
            className="py-1.5 text-center text-xs font-semibold uppercase tracking-[0.08em] text-cream-faint"
          >
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div role="row" key={week[0].ymd} className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {week.map((day) =>
            day.inMonth ? (
              <div role="gridcell" key={day.ymd} className="grid">
                {renderDay(day)}
              </div>
            ) : (
              <div role="gridcell" key={day.ymd} aria-hidden className={cn(dayCell, "opacity-40")}>
                {parseYmd(day.ymd).getUTCDate()}
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

/** Loading: the same frame with every tile as a skeleton. */
export function CalendarSkeleton({ className }: { className?: string }) {
  return (
    <div aria-busy="true" aria-label="Loading the calendar" className={cn("w-full max-w-[520px] rounded-card-md bg-ink-soft p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {Array.from({ length: 42 }, (_, i) => (
          <Skeleton key={i} className="aspect-square min-h-11" />
        ))}
      </div>
    </div>
  );
}

// ─── Customer calendar (booking step 1) ──────────────────────────────────────

/** Look per customer state. Shape or pattern differs, not only colour. */
export const DAY_LOOK: Record<DayState, string> = {
  available: "bg-ink-raised font-semibold text-cream hover:shadow-[inset_0_0_0_1px_theme(colors.cream.DEFAULT)] cursor-pointer",
  selected: "bg-ember font-extrabold text-ink [--cal-dot:theme(colors.ink.DEFAULT)] cursor-pointer",
  unavailable: "cal-strike",
  soon: "cal-hatch",
  beyond: "cal-ring",
  past: "opacity-40",
};

/**
 * Admin calendar looks (shared with /dev/components). Shape or pattern differs, not only colour:
 * held = dashed ember outline, booked = solid ember, completed = solid cream with a check,
 * blocked = cream hatch, free = the plain tile, past = 40%.
 */
export type AdminDayLook = "held" | "booked" | "completed" | "blocked" | "free" | "past";
export const ADMIN_DAY_LOOK: Record<AdminDayLook, string> = {
  held: "border-2 border-dashed border-ember font-semibold text-cream cursor-pointer",
  booked: "bg-ember font-extrabold text-ink [--cal-dot:theme(colors.ink.DEFAULT)] cursor-pointer",
  completed: "cal-done bg-cream font-bold text-ink [--cal-dot:theme(colors.ink.DEFAULT)] cursor-pointer",
  blocked: "cal-block font-bold text-cream cursor-pointer",
  free: "bg-ink-raised font-semibold text-cream hover:shadow-[inset_0_0_0_1px_theme(colors.cream.DEFAULT)] cursor-pointer",
  past: "opacity-40",
};

const ymKey = (v: { year: number; month: number }) => v.year * 12 + v.month;

/**
 * Booking step 1. Seven looks: available, selected, unavailable (strike), too soon (hatch),
 * not open yet (small ring), today (ember dot, combines with any), other month (40%).
 * Only pickable days are buttons. One tab stop (roving tabindex); arrows move by day and
 * week onto the nearest pickable day, Page Up/Down change month, Home/End go to the week's
 * ends, Enter or Space picks.
 */
export function BookingCalendar({
  availability,
  today,
  selected,
  onSelect,
  className,
}: {
  availability: CateringAvailability;
  /** Malaysia today, YYYY-MM-DD (klToday()). */
  today: string;
  selected: string | null;
  onSelect: (ymd: string) => void;
  className?: string;
}) {
  const taken = useMemo(() => new Set(availability.unavailable), [availability.unavailable]);
  const stateOf = (ymd: string) => classifyDay(ymd, { today, availability, taken, selected });
  const pickable = (ymd: string) => isPickable(stateOf(ymd));

  const first = monthOf(today);
  const last = monthOf(availability.maxDate);
  const [view, setView] = useState(() => monthOf(selected ?? availability.minDate));
  const [focusYmd, setFocusYmd] = useState<string | null>(null);
  const wantFocus = useRef<"day" | "next" | "prev" | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);

  // A cleared or changed date (e.g. "date taken") shows its month again.
  useEffect(() => {
    if (selected) setView(monthOf(selected));
  }, [selected]);

  const inView = (ymd: string) => {
    const m = monthOf(ymd);
    return m.year === view.year && m.month === view.month;
  };
  const monthDays = useMemo(
    () => buildMonthGrid(view.year, view.month).flat().filter((d) => d.inMonth).map((d) => d.ymd),
    [view.year, view.month],
  );
  const openDays = monthDays.filter(pickable);
  // The one tab stop in this month.
  const tabStop =
    (focusYmd && inView(focusYmd) && pickable(focusYmd) && focusYmd) ||
    (selected && inView(selected) && selected) ||
    openDays[0] ||
    null;

  useEffect(() => {
    if (!wantFocus.current) return;
    const target = wantFocus.current;
    wantFocus.current = null;
    if (target === "next") nextRef.current?.focus();
    else if (target === "prev") prevRef.current?.focus();
    else if (tabStop) gridRef.current?.querySelector<HTMLButtonElement>(`[data-ymd="${tabStop}"]`)?.focus();
  });

  const go = (delta: number) => {
    const k = ymKey(view) + delta;
    if (k < ymKey(first) || k > ymKey(last)) return;
    // The arrow just used becomes disabled at the window's edge: move focus to the other one.
    if (k === ymKey(last) && document.activeElement === nextRef.current) wantFocus.current = "prev";
    if (k === ymKey(first) && document.activeElement === prevRef.current) wantFocus.current = "next";
    setView({ year: Math.floor(k / 12), month: k % 12 });
  };

  const maxYmd = (a: string, b: string) => (a > b ? a : b);
  const minYmd = (a: string, b: string) => (a < b ? a : b);

  /** Nearest pickable day from `from`, stepping by `dir`, inside the window. */
  const seek = (from: string, dir: 1 | -1, stopAt?: string) => {
    for (let d = from; d >= availability.minDate && d <= availability.maxDate; d = addDaysYmd(d, dir)) {
      if (pickable(d)) return d;
      if (d === stopAt) return null;
    }
    return null;
  };

  const moveTo = (ymd: string | null) => {
    if (!ymd) return;
    setFocusYmd(ymd);
    setView(monthOf(ymd));
    wantFocus.current = "day";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = (e.target as HTMLElement).dataset?.ymd;
    if (!cur) return;
    const dow = (parseYmd(cur).getUTCDay() + 6) % 7;
    let handled = true;
    switch (e.key) {
      case "ArrowRight":
        moveTo(seek(addDaysYmd(cur, 1), 1));
        break;
      case "ArrowLeft":
        moveTo(seek(addDaysYmd(cur, -1), -1));
        break;
      case "ArrowDown":
        moveTo(seek(addDaysYmd(cur, 7), 1));
        break;
      case "ArrowUp":
        moveTo(seek(addDaysYmd(cur, -7), -1));
        break;
      case "Home":
        moveTo(seek(maxYmd(addDaysYmd(cur, -dow), availability.minDate), 1, cur));
        break;
      case "End":
        moveTo(seek(minYmd(addDaysYmd(cur, 6 - dow), availability.maxDate), -1, cur));
        break;
      case "PageDown":
      case "PageUp": {
        const delta = e.key === "PageDown" ? 1 : -1;
        const target = ymKey(view) + delta;
        if (target < ymKey(first) || target > ymKey(last)) break;
        const year = Math.floor(target / 12);
        const month = target % 12;
        const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const day = Math.min(parseYmd(cur).getUTCDate(), dim);
        const pad = (n: number) => String(n).padStart(2, "0");
        const monthStart = `${year}-${pad(month + 1)}-01`;
        const monthEnd = `${year}-${pad(month + 1)}-${pad(dim)}`;
        // Same day of the month, kept inside the bookable window.
        let same = `${year}-${pad(month + 1)}-${pad(day)}`;
        if (same < availability.minDate) same = availability.minDate;
        if (same > availability.maxDate) same = availability.maxDate;
        const found = seek(same, 1, monthEnd) ?? seek(same, -1, monthStart);
        setView({ year, month });
        if (found && monthOf(found).month === month && monthOf(found).year === year) {
          setFocusYmd(found);
          wantFocus.current = "day";
        } else {
          // No open day in that month: keep focus visible on an enabled month arrow.
          wantFocus.current = target < ymKey(last) ? "next" : "prev";
        }
        break;
      }
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  };

  const legend = (
    <>
      <LegendItem look={DAY_LOOK.available}>Available</LegendItem>
      <LegendItem look={DAY_LOOK.selected}>Your date</LegendItem>
      <LegendItem look={DAY_LOOK.unavailable}>Unavailable</LegendItem>
      <LegendItem look={DAY_LOOK.soon}>Too soon</LegendItem>
      <LegendItem look={DAY_LOOK.beyond}>Not open yet</LegendItem>
      <LegendItem look="cal-today bg-ink-raised">Today</LegendItem>
    </>
  );

  const nextDisabled = ymKey(view) >= ymKey(last);
  return (
    <CalendarShell
      className={className}
      title={formatMonthYear(view.year, view.month)}
      onPrev={() => go(-1)}
      onNext={() => go(1)}
      prevDisabled={ymKey(view) <= ymKey(first)}
      nextDisabled={nextDisabled}
      nextRef={nextRef}
      prevRef={prevRef}
      legend={legend}
      footer={
        <>
          {openDays.length === 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="type-small m-0 text-cream-muted">{bookingCopy.noOpenDates}</p>
              {!nextDisabled && (
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cream underline decoration-ember underline-offset-4"
                >
                  Next month
                  <ArrowRight aria-hidden size={16} strokeWidth={1.75} />
                </button>
              )}
            </div>
          )}
          <p className="m-0 mt-4 font-semibold" aria-live="polite">
            {selected ? formatLong(selected) : bookingCopy.noDate}
          </p>
        </>
      }
    >
      <div ref={gridRef} key={ymKey(view)} className="animate-fade-in">
        <MonthGrid
          year={view.year}
          month={view.month}
          onKeyDown={onKeyDown}
          renderDay={({ ymd }) => {
            const state = stateOf(ymd);
            const isToday = ymd === today;
            const label = `${formatLong(ymd)}, ${DAY_STATE_LABEL[state]}${isToday ? ", today" : ""}`;
            const look = cn(dayCell, DAY_LOOK[state], isToday && "cal-today");
            const n = parseYmd(ymd).getUTCDate();
            return isPickable(state) ? (
              <button
                type="button"
                data-ymd={ymd}
                tabIndex={ymd === tabStop ? 0 : -1}
                aria-label={label}
                aria-pressed={state === "selected"}
                onClick={() => {
                  setFocusYmd(ymd);
                  onSelect(ymd);
                }}
                className={look}
              >
                {n}
              </button>
            ) : (
              <div className={look}>
                <span aria-hidden>{n}</span>
                <span className="sr-only">{label}</span>
              </div>
            );
          }}
        />
      </div>
    </CalendarShell>
  );
}
