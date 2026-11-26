"use client";

import { useMemo, useState } from "react";
import { klToday, monthOf, formatMonthYear, parseYmd } from "@/lib/dates";
import { formatDateLabel, slotLabel } from "@/lib/shop";
import type { ShopAvailability } from "@/lib/shop-api";
import { CalendarShell, DAY_LOOK, LegendItem, MonthGrid, dayCell } from "@/components/booking/calendar";
import { cn } from "@/lib/utils";

/** Why a day can or cannot be picked. Each has its own pattern, not only a colour. */
type DayKind = "open" | "selected" | "notYet" | "closed" | "tooFar" | "past";

const KIND_LOOK: Record<DayKind, string> = {
  open: DAY_LOOK.available,
  selected: DAY_LOOK.selected,
  notYet: DAY_LOOK.soon,
  closed: DAY_LOOK.unavailable,
  tooFar: DAY_LOOK.beyond,
  past: DAY_LOOK.past,
};

const KIND_REASON: Record<Exclude<DayKind, "open" | "selected">, string> = {
  notYet: "not open for orders yet",
  closed: "closed",
  tooFar: "too far ahead to order",
  past: "in the past",
};

const monthIndex = (m: { year: number; month: number }) => m.year * 12 + m.month;

/** "12:00-13:00" slots of a day -> "12pm to 8pm". */
function servingHours(slots: string[]): string {
  if (slots.length === 0) return "";
  const first = slotLabel(slots[0]).split(" – ")[0];
  const last = slotLabel(slots[slots.length - 1]).split(" – ")[1];
  return `${first} to ${last}`;
}

/**
 * The date and time picker at checkout. A month calendar shows every day and why it can or cannot
 * be picked (before our first cooking day, closed, too far ahead), with the ordering timeline
 * above it, so a customer never has to guess from a blank native date field. Times for the picked
 * day are buttons, since each day can serve different hours.
 */
export function WhenPicker({
  avail,
  date,
  slot,
  onDate,
  onSlot,
  dateError,
  slotError,
}: {
  avail: ShopAvailability;
  date: string;
  slot: string;
  onDate: (ymd: string) => void;
  onSlot: (slot: string) => void;
  dateError?: string;
  slotError?: string;
}) {
  const today = klToday();
  const slotsByDate = useMemo(() => new Map(avail.days.map((d) => [d.date, d.slots])), [avail.days]);
  const firstOpen = avail.days[0]?.date ?? avail.minDate;
  const lastOpen = avail.days[avail.days.length - 1]?.date ?? avail.maxDate;

  const [view, setView] = useState(() => monthOf(date || firstOpen));
  const firstMonth = Math.min(monthIndex(monthOf(today)), monthIndex(monthOf(firstOpen)));
  const lastMonth = monthIndex(monthOf(avail.maxDate));
  const step = (by: number) =>
    setView((v) => {
      const i = monthIndex(v) + by;
      return { year: Math.floor(i / 12), month: i % 12 };
    });

  const kindOf = (ymd: string): DayKind => {
    if (ymd === date && slotsByDate.has(ymd)) return "selected";
    if (ymd < today) return "past";
    if (ymd < avail.minDate) return "notYet";
    if (ymd > avail.maxDate) return "tooFar";
    return slotsByDate.has(ymd) ? "open" : "closed";
  };

  const daySlots = date ? (slotsByDate.get(date) ?? []) : [];

  // The ordering timeline: when orders open, the first day we cook, and how far ahead we take.
  const timeline = [
    avail.ordersOpenDate
      ? {
          label: avail.ordersOpen ? "Pre-orders opened" : "Pre-orders open",
          value: formatDateLabel(avail.ordersOpenDate),
          done: avail.ordersOpen,
        }
      : { label: "Ordering", value: "Open now", done: true },
    { label: "First day we cook", value: formatDateLabel(firstOpen), done: today >= firstOpen },
    { label: "Booking up to", value: formatDateLabel(lastOpen), done: false },
  ];

  return (
    <div className="grid gap-6">
      <ol className="m-0 grid list-none gap-0 rounded-card-sm border border-cream-faint p-0 sm:grid-cols-3">
        {timeline.map((t, i) => (
          <li
            key={t.label}
            className={cn(
              "grid gap-1 px-5 py-4",
              i > 0 && "border-t border-ink-line sm:border-l sm:border-t-0",
            )}
          >
            <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-cream-faint">
              <span
                aria-hidden
                className={cn("h-2 w-2 rounded-full", t.done ? "bg-ember" : "border border-cream-faint")}
              />
              {t.label}
            </span>
            <span className="font-semibold text-cream">{t.value}</span>
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <CalendarShell
            title={formatMonthYear(view.year, view.month)}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            prevDisabled={monthIndex(view) <= firstMonth}
            nextDisabled={monthIndex(view) >= lastMonth}
            legend={
              <>
                <LegendItem look={KIND_LOOK.open}>Open</LegendItem>
                <LegendItem look={KIND_LOOK.notYet}>Not open yet</LegendItem>
                <LegendItem look={KIND_LOOK.closed}>Closed</LegendItem>
                <LegendItem look={KIND_LOOK.tooFar}>Too far ahead</LegendItem>
              </>
            }
          >
            <MonthGrid
              year={view.year}
              month={view.month}
              renderDay={({ ymd }) => {
                const kind = kindOf(ymd);
                const n = parseYmd(ymd).getUTCDate();
                if (kind === "open" || kind === "selected") {
                  return (
                    <button
                      type="button"
                      onClick={() => onDate(ymd)}
                      aria-pressed={kind === "selected"}
                      aria-label={`${formatDateLabel(ymd)}, serving ${servingHours(slotsByDate.get(ymd) ?? [])}`}
                      className={cn(dayCell, KIND_LOOK[kind])}
                    >
                      {n}
                    </button>
                  );
                }
                return (
                  <div
                    aria-label={`${formatDateLabel(ymd)}, ${KIND_REASON[kind]}`}
                    className={cn(dayCell, KIND_LOOK[kind], "cursor-not-allowed")}
                  >
                    {n}
                  </div>
                );
              }}
            />
          </CalendarShell>
          {dateError && (
            <p role="alert" className="type-small m-0 text-ember">
              {dateError}
            </p>
          )}
        </div>

        <div className="grid content-start gap-3">
          <div className="grid gap-1">
            <h4 className="m-0 text-sm font-semibold text-cream">
              {date && daySlots.length > 0 ? `Times on ${formatDateLabel(date)}` : "Time"}
            </h4>
            <p className="type-small m-0 text-cream-muted">
              {date && daySlots.length > 0
                ? `Serving ${servingHours(daySlots)} that day. Malaysia time (GMT+8).`
                : "Pick a date to see the times we serve that day."}
            </p>
          </div>
          {daySlots.length > 0 && (
            <div role="radiogroup" aria-label="Time" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
              {daySlots.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={slot === s}
                  onClick={() => onSlot(s)}
                  className={cn(
                    "min-h-12 rounded-card-sm border px-3 text-[15px] font-semibold transition-colors",
                    slot === s
                      ? "border-ember bg-ember text-ink"
                      : "border-cream-faint text-cream hover:border-cream",
                  )}
                >
                  {slotLabel(s)}
                </button>
              ))}
            </div>
          )}
          {slotError && (
            <p role="alert" className="type-small m-0 text-ember">
              {slotError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
