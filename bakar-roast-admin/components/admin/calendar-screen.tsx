"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarOff, CalendarCheck, Minus, Plus, X } from "lucide-react";
import { ApiError, type CateringCalendarDay } from "@/lib/api";
import {
  adminCalendar,
  adminCloseDays,
  adminGetSettings,
  adminOpenDays,
  adminSetDay,
  adminSetRangeHours,
} from "@/lib/catering-api";
import { formatTime12, HALF_HOURS } from "@/lib/booking";
import {
  addDaysYmd,
  addMonthsYmd,
  formatLong,
  formatMonthYear,
  formatShort,
  klToday,
  monthOf,
  parseYmd,
  toYmd,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { StatusChip } from "@/components/ui/status-chip";
import {
  ADMIN_DAY_LOOK,
  CalendarShell,
  CalendarSkeleton,
  dayCell,
  LegendItem,
  MonthGrid,
  type AdminDayLook,
} from "@/components/booking/calendar";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminPage, describeError, LoadError } from "@/components/admin/admin-page";
import { DateBlock } from "@/components/admin/date-block";
import { useAdminQuery } from "@/components/admin/use-admin-query";

type View = "month" | "list";
type Ym = { year: number; month: number };
type Entry = CateringCalendarDay;
type Notice = { tone: "ok" | "error"; title: string; help?: string } | null;

const pad = (n: number) => String(n).padStart(2, "0");
const ymKey = (v: Ym) => v.year * 12 + v.month;
const ymText = (v: Ym) => `${v.year}-${pad(v.month + 1)}`;
const fromKey = (k: number): Ym => ({ year: Math.floor(k / 12), month: ((k % 12) + 12) % 12 });
const monthStart = (v: Ym) => `${ymText(v)}-01`;
const monthEnd = (v: Ym) => toYmd(new Date(Date.UTC(v.year, v.month + 1, 0)));
const MONTH_NAME = (v: Ym) => formatMonthYear(v.year, v.month).split(" ")[0];

type Hours = { start: string; end: string };

/** A date with no calendar row: open, default sets and hours, no bookings. */
const blankDay = (date: string, sets: number, hours: Hours): Entry => ({
  date,
  closed: false,
  reason: null,
  capacity: sets,
  customCapacity: false,
  deliveryStart: hours.start,
  deliveryEnd: hours.end,
  customHours: false,
  bookings: [],
});

/** "10:00 am to 9:00 pm" */
const hoursText = (start: string, end: string) => `${formatTime12(start)} to ${formatTime12(end)}`;

/** Start and end selects over every half hour. */
function HoursFields({
  idBase,
  start,
  end,
  onStart,
  onEnd,
  disabled,
}: {
  idBase: string;
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 items-start gap-3">
      <SelectField id={`${idBase}-start`} size="sm" label="Deliveries start" value={start} disabled={disabled} onChange={(e) => onStart(e.target.value)}>
        {HALF_HOURS.map((t) => (
          <option key={t} value={t}>
            {formatTime12(t)}
          </option>
        ))}
      </SelectField>
      <SelectField
        id={`${idBase}-end`}
        size="sm"
        label="Last delivery"
        value={end}
        disabled={disabled}
        error={end <= start ? "Must be after the start." : undefined}
        onChange={(e) => onEnd(e.target.value)}
      >
        {HALF_HOURS.map((t) => (
          <option key={t} value={t}>
            {formatTime12(t)}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

/** The look of a day, the words it is read out with, and its "2/5" count. */
function dayState(ymd: string, e: Entry | undefined, today: string, sets: number, hours: Hours) {
  const day = e ?? blankDay(ymd, sets, hours);
  const n = day.bookings.length;
  const count = n > 0 || day.customCapacity ? `${n}/${day.capacity}` : null;
  let look: AdminDayLook;
  let words: string;
  if (day.closed) {
    look = "blocked";
    words = day.reason ? `closed, ${day.reason}` : "closed";
  } else if (ymd < today) {
    look = n > 0 ? "completed" : "past";
    words = n > 0 ? `${n} booked` : "past";
  } else if (day.capacity > 0 && n >= day.capacity) {
    look = "booked";
    words = `full, ${n} of ${day.capacity} sets`;
  } else if (n > 0) {
    look = "held";
    words = `${n} of ${day.capacity} sets booked`;
  } else if (day.capacity === 0) {
    look = "blocked";
    words = "no sets";
  } else {
    look = "free";
    words = `open, ${day.capacity} sets`;
  }
  return { look, words, count };
}

/**
 * Admin calendar for delivery orders. Each day takes a number of sets (the default from Settings,
 * or this day's own number). Close or open a whole range at once, or tap a day to change its sets,
 * close it, or open one of its bookings. Month view or List view; the view and month ride in the
 * URL so Back from a request lands on the same place.
 */
export function CalendarScreen() {
  const params = useSearchParams();
  const { run } = useAdmin();
  const today = klToday();
  const [view, setViewState] = useState<View>(params.get("view") === "list" ? "list" : "month");
  const [month, setMonthState] = useState<Ym>(() => {
    const m = /^(\d{4})-(\d{2})$/.exec(params.get("month") ?? "");
    return m && +m[2] >= 1 && +m[2] <= 12 ? { year: +m[1], month: +m[2] - 1 } : monthOf(today);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const viewQuery = (v: View, m: Ym) => (v === "list" ? "view=list" : `month=${ymText(m)}`);
  const remember = (v: View, m: Ym) => window.history.replaceState(null, "", `/admin/calendar?${viewQuery(v, m)}`);
  const setView = (v: View) => {
    setViewState(v);
    remember(v, month);
  };
  const setMonth = (m: Ym) => {
    setMonthState(m);
    remember(view, m);
  };

  const listTo = addDaysYmd(addMonthsYmd(today, 12), -1);
  const range = view === "list" ? { from: today, to: listTo } : { from: monthStart(month), to: monthEnd(month) };
  const key = `${view}:${range.from}:${range.to}`;
  const q = useAdminQuery(
    async (t) => {
      const [days, settings] = await Promise.all([adminCalendar(t, range.from, range.to), adminGetSettings(t)]);
      return {
        key,
        entries: days,
        sets: settings.cateringDailySets ?? 5,
        hours: { start: settings.cateringDeliveryStart ?? "10:00", end: settings.cateringDeliveryEnd ?? "21:00" },
      };
    },
    [key],
  );
  // The previous month's data stays in q.data while the next one loads: never draw it on this month.
  const entries = q.data?.key === key ? q.data.entries : undefined;
  const sets = q.data?.sets ?? 5;
  const hours = q.data?.hours ?? { start: "10:00", end: "21:00" };
  const byDate = new Map((entries ?? []).map((e) => [e.date, e]));

  const requestHref = (id: string) => `/admin/requests/${id}?from=calendar&${viewQuery(view, month)}`;
  const done = (n: Notice) => {
    setNotice(n);
    void q.reload();
  };

  const toggle = (
    <div role="group" aria-label="View" className="inline-flex gap-0.5 rounded-full bg-ink-raised p-1">
      {(["month", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => setView(v)}
          className={cn(
            "min-h-11 rounded-full px-4 font-semibold",
            view === v ? "bg-cream text-ink" : "text-cream-muted hover:text-cream",
          )}
        >
          {v === "month" ? "Month" : "List"}
        </button>
      ))}
    </div>
  );

  const selectedDay = selected ? (byDate.get(selected) ?? blankDay(selected, sets, hours)) : null;

  return (
    <AdminPage
      title="Calendar"
      actions={toggle}
      lead={`Each day takes ${sets} ${sets === 1 ? "order" : "orders"}, delivered ${hoursText(hours.start, hours.end)}, unless you change it. Tap a day to change it, or change a whole stretch below.`}
    >
      {notice && (
        <Banner tone={notice.tone} title={notice.title}>
          {notice.help}
        </Banner>
      )}
      {q.error ? <LoadError onRetry={q.reload} /> : null}

      <RangeCard key={`${hours.start}-${hours.end}`} today={today} hours={hours} onDone={done} run={run} />

      {view === "month" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,760px)_minmax(0,1fr)]">
          {entries === undefined && q.data === undefined && !q.error ? (
            <CalendarSkeleton />
          ) : (
            <AdminMonth
              month={month}
              today={today}
              entries={entries}
              sets={sets}
              hours={hours}
              selected={selected}
              onMonth={setMonth}
              onDay={(ymd) => {
                setNotice(null);
                setSelected((cur) => (cur === ymd ? null : ymd));
              }}
            />
          )}
          <section aria-labelledby="glance" className="grid content-start gap-3">
            {selectedDay ? (
              <DayPanel
                key={selectedDay.date}
                day={selectedDay}
                today={today}
                defaultSets={sets}
                defaultHours={hours}
                href={requestHref}
                run={run}
                onClose={() => setSelected(null)}
                onDone={done}
              />
            ) : null}
            <h2 id="glance" className="m-0 text-lg font-bold">
              {MONTH_NAME(month)} at a glance
            </h2>
            {entries === undefined ? (
              q.error ? null : <RowsSkeleton />
            ) : entries.length ? (
              <ul className="m-0 grid list-none gap-2 p-0">
                {entries.map((e) => (
                  <DayRow key={e.date} day={e} href={requestHref} onPick={() => setSelected(e.date)} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing this month.">No orders and no closed days.</EmptyState>
            )}
          </section>
        </div>
      ) : entries === undefined ? (
        q.error ? null : <RowsSkeleton />
      ) : entries.length ? (
        <div className="grid items-start gap-x-6 gap-y-2 xl:grid-cols-2">
          {groupByMonth(entries).map(([label, rows]) => (
            <section key={label} aria-label={label} className="grid gap-2">
              <h2 className="m-0 mt-2 text-lg font-bold">{label}</h2>
              <ul className="m-0 grid list-none gap-2 p-0">
                {rows.map((e) => (
                  <DayRow
                    key={e.date}
                    day={e}
                    href={requestHref}
                    onPick={() => {
                      setMonth(monthOf(e.date));
                      setView("month");
                      setSelected(e.date);
                    }}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing on the calendar from today on.">No orders and no closed days.</EmptyState>
      )}
    </AdminPage>
  );
}

type Run = <T>(call: (token: string) => Promise<T>) => Promise<T>;

/** Change a whole range at once: close it, open it, or set its delivery hours. */
function RangeCard({ today, hours, onDone, run }: { today: string; hours: Hours; onDone: (n: Notice) => void; run: Run }) {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDaysYmd(today, 6));
  const [reason, setReason] = useState("");
  const [start, setStart] = useState(hours.start);
  const [end, setEnd] = useState(hours.end);
  const [busy, setBusy] = useState<"close" | "open" | "hours" | "usual" | null>(null);
  const bad = !from || !to ? "Pick both dates." : to < from ? "The last day must be on or after the first." : null;
  const span = from && to && !bad ? `${formatShort(from)} to ${formatShort(to)}` : "";

  const act = async (kind: "close" | "open" | "hours" | "usual") => {
    if (bad) return;
    setBusy(kind);
    try {
      if (kind === "close") {
        const rows = await run((t) => adminCloseDays(t, from, to, reason.trim() || undefined));
        onDone({
          tone: "ok",
          title: `Closed ${rows.length} ${rows.length === 1 ? "day" : "days"}: ${span}.`,
          help: "Orders already on those days stay. Nobody can book new ones.",
        });
        setReason("");
      } else if (kind === "open") {
        const res = await run((t) => adminOpenDays(t, from, to));
        onDone({
          tone: "ok",
          title: res.opened > 0 ? `Opened ${res.opened} ${res.opened === 1 ? "day" : "days"}: ${span}.` : "Those days were already open.",
        });
      } else if (kind === "hours") {
        await run((t) => adminSetRangeHours(t, from, to, start, end));
        onDone({ tone: "ok", title: `Deliveries ${hoursText(start, end)} on ${span}.` });
      } else {
        await run((t) => adminSetRangeHours(t, from, to, null, null));
        onDone({ tone: "ok", title: `${span} is back to the usual ${hoursText(hours.start, hours.end)}.` });
      }
    } catch (err) {
      onDone({ tone: "error", ...describeError(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="range-h" className="grid gap-5 rounded-card-md bg-ink-raised p-4 sm:p-5">
      <div>
        <h2 id="range-h" className="m-0 text-lg font-bold">
          Change a stretch of dates
        </h2>
        <p className="m-0 text-sm text-cream-muted">
          Close the days you are off, open them again, or set different delivery hours for them.
        </p>
      </div>
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <Field size="sm" type="date" label="From" min={today} value={from} onChange={(e) => setFrom(e.target.value)} />
        <Field
          size="sm"
          type="date"
          label="To"
          min={from || today}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          error={bad ?? undefined}
        />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="grid content-start gap-3 rounded-card-sm p-4 shadow-[inset_0_0_0_1px_theme(colors.ink.line)]">
          <b className="text-sm">Open or closed</b>
          <Field
            size="sm"
            label="Reason for closing"
            optional
            help="Only you see this."
            placeholder="Raya break"
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="cream" onClick={() => void act("close")} loading={busy === "close"} loadingLabel="Closing" disabled={!!bad || !!busy}>
              <span className="inline-flex items-center gap-2">
                <CalendarOff aria-hidden size={16} />
                Close these dates
              </span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void act("open")} loading={busy === "open"} loadingLabel="Opening" disabled={!!bad || !!busy}>
              <span className="inline-flex items-center gap-2">
                <CalendarCheck aria-hidden size={16} />
                Open these dates
              </span>
            </Button>
          </div>
        </div>
        <div className="grid content-start gap-3 rounded-card-sm p-4 shadow-[inset_0_0_0_1px_theme(colors.ink.line)]">
          <b className="text-sm">Delivery hours</b>
          <HoursFields idBase="range-hours" start={start} end={end} onStart={setStart} onEnd={setEnd} disabled={!!busy} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="cream"
              onClick={() => void act("hours")}
              loading={busy === "hours"}
              loadingLabel="Saving"
              disabled={!!bad || !!busy || end <= start}
            >
              Set these hours
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void act("usual")} loading={busy === "usual"} loadingLabel="Saving" disabled={!!bad || !!busy}>
              Use usual hours
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One day: its sets, open or closed, and the orders on it. Opens beside the month grid. */
function DayPanel({
  day,
  today,
  defaultSets,
  defaultHours,
  href,
  run,
  onClose,
  onDone,
}: {
  day: Entry;
  today: string;
  defaultSets: number;
  defaultHours: Hours;
  href: (id: string) => string;
  run: Run;
  onClose: () => void;
  onDone: (n: Notice) => void;
}) {
  const [cap, setCap] = useState(day.capacity);
  const [start, setStart] = useState(day.deliveryStart);
  const [end, setEnd] = useState(day.deliveryEnd);
  const [reason, setReason] = useState(day.reason ?? "");
  const [busy, setBusy] = useState(false);
  const past = day.date < today;
  const n = day.bookings.length;
  const name = formatLong(day.date);

  const call = async (fn: (t: string) => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await run(fn);
      onDone({ tone: "ok", title: ok });
    } catch (err) {
      onDone({
        tone: "error",
        ...(err instanceof ApiError && err.status === 404 ? { title: "That day was already open." } : describeError(err)),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label={name} className="grid gap-4 rounded-card-md p-4 shadow-[inset_0_0_0_1.5px_theme(colors.ember.DEFAULT)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <DateBlock ymd={day.date} />
          <div>
            <b className="block text-base">{name}</b>
            <span className="text-sm text-cream-muted">
              {day.closed ? "Closed" : `${n} of ${day.capacity} sets booked · ${hoursText(day.deliveryStart, day.deliveryEnd)}`}
              {day.closed && day.reason ? `: ${day.reason}` : ""}
            </span>
          </div>
        </div>
        <button type="button" aria-label="Close this panel" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-cream-muted hover:text-cream">
          <X aria-hidden size={18} />
        </button>
      </div>

      {!past && (
        <div className="grid gap-2">
          <span className="text-[13px] font-semibold">Sets this day</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="One fewer set"
              disabled={busy || cap <= 0}
              onClick={() => setCap((c) => Math.max(0, c - 1))}
              className="grid h-11 w-11 place-items-center rounded-full shadow-[inset_0_0_0_1px_theme(colors.cream.faint)] disabled:opacity-40"
            >
              <Minus aria-hidden size={16} />
            </button>
            <span className="min-w-12 text-center text-2xl font-extrabold tabular-nums" aria-live="polite">
              {cap}
            </span>
            <button
              type="button"
              aria-label="One more set"
              disabled={busy || cap >= 200}
              onClick={() => setCap((c) => Math.min(200, c + 1))}
              className="grid h-11 w-11 place-items-center rounded-full shadow-[inset_0_0_0_1px_theme(colors.cream.faint)] disabled:opacity-40"
            >
              <Plus aria-hidden size={16} />
            </button>
            <Button
              size="sm"
              variant="cream"
              disabled={busy || cap === day.capacity}
              onClick={() => void call((t) => adminSetDay(t, day.date, { capacity: cap }), `${formatShort(day.date)} now takes ${cap} ${cap === 1 ? "set" : "sets"}.`)}
            >
              Save
            </Button>
            {day.customCapacity && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void call((t) => adminSetDay(t, day.date, { capacity: null }), `${formatShort(day.date)} is back to the usual ${defaultSets}.`)}
              >
                Use usual ({defaultSets})
              </Button>
            )}
          </div>
          {cap < n && <p className="type-small m-0 text-cream-muted">This day already has {n} orders. They all stay.</p>}
        </div>
      )}

      {!past && (
        <div className="grid gap-2">
          <span className="text-[13px] font-semibold">Delivery hours this day</span>
          <HoursFields idBase={`day-${day.date}`} start={start} end={end} onStart={setStart} onEnd={setEnd} disabled={busy} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="cream"
              disabled={busy || end <= start || (start === day.deliveryStart && end === day.deliveryEnd)}
              onClick={() =>
                void call(
                  (t) => adminSetDay(t, day.date, { deliveryStart: start, deliveryEnd: end }),
                  `${formatShort(day.date)}: deliveries ${hoursText(start, end)}.`,
                )
              }
            >
              Save hours
            </Button>
            {day.customHours && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void call(
                    (t) => adminSetDay(t, day.date, { deliveryStart: null, deliveryEnd: null }),
                    `${formatShort(day.date)} is back to the usual ${hoursText(defaultHours.start, defaultHours.end)}.`,
                  )
                }
              >
                Use usual hours
              </Button>
            )}
          </div>
        </div>
      )}

      {!past &&
        (day.closed ? (
          <div>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void call((t) => adminOpenDays(t, day.date, day.date), `${formatShort(day.date)} is open again.`)}>
              Open this day
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <Field size="sm" label="Close this day" optional placeholder="Reason, only you see it" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void call((t) => adminCloseDays(t, day.date, day.date, reason.trim() || undefined), `${formatShort(day.date)} is closed.`)
              }
            >
              Close it
            </Button>
          </div>
        ))}

      {n > 0 && (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Orders this day">
          {day.bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={href(b.id)}
                className="flex items-center justify-between gap-3 rounded-card-sm bg-ink-raised p-3 text-cream no-underline hover:shadow-[inset_0_0_0_1px_theme(colors.cream.faint)]"
              >
                <span className="grid min-w-0">
                  <b className="[overflow-wrap:anywhere]">{b.customerName}</b>
                  <span className="text-[13px] text-cream-muted">
                    {formatTime12(b.serviceTime)} · {b.reference}
                  </span>
                </span>
                <StatusChip status={b.status} className="flex-none" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const groupByMonth = (entries: Entry[]) => {
  const out: [string, Entry[]][] = [];
  for (const e of entries) {
    const m = monthOf(e.date);
    const label = formatMonthYear(m.year, m.month);
    if (out[out.length - 1]?.[0] !== label) out.push([label, []]);
    out[out.length - 1][1].push(e);
  }
  return out;
};

/** One day in the list: closed, or its orders. Tapping the day opens its panel. */
function DayRow({ day: e, href, onPick }: { day: Entry; href: (id: string) => string; onPick: () => void }) {
  return (
    <li className="grid gap-2 rounded-card-sm bg-ink-raised p-3">
      <button type="button" onClick={onPick} className="flex items-center gap-3 text-left">
        <DateBlock ymd={e.date} />
        <span className="grid min-w-0 gap-0.5">
          <b className="text-base">
            {e.closed ? "Closed" : `${e.bookings.length} of ${e.capacity} sets`}
            {e.customCapacity && !e.closed ? " (custom)" : ""}
          </b>
          {!e.closed && e.customHours && (
            <span className="text-[13px] text-cream-muted">Deliveries {hoursText(e.deliveryStart, e.deliveryEnd)}</span>
          )}
          {e.closed && <span className="text-[13px] text-cream-muted [overflow-wrap:anywhere]">{e.reason || "No reason given."}</span>}
        </span>
      </button>
      {e.bookings.length > 0 && (
        <ul className="m-0 grid list-none gap-1 p-0 pl-[60px]">
          {e.bookings.map((b) => (
            <li key={b.id}>
              <Link href={href(b.id)} className="flex flex-wrap items-center gap-2 text-sm text-cream no-underline hover:underline">
                <span className="font-semibold">{b.customerName}</span>
                <span className="text-cream-muted">{formatTime12(b.serviceTime)}</span>
                <StatusChip status={b.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * The month grid in admin looks. Every day of the month is in the one roving tab stop (free past
 * days are aria-disabled), so arrows, Home/End and Page Up/Down work in any month. Moving past the
 * month's edge turns the page. `entries` undefined = still loading (neutral days, taps ignored).
 */
function AdminMonth({
  month,
  today,
  entries,
  sets,
  hours,
  selected,
  onMonth,
  onDay,
}: {
  month: Ym;
  today: string;
  entries: Entry[] | undefined;
  sets: number;
  hours: Hours;
  selected: string | null;
  onMonth: (m: Ym) => void;
  onDay: (ymd: string) => void;
}) {
  const byDate = new Map((entries ?? []).map((e) => [e.date, e]));
  const [focusYmd, setFocusYmd] = useState<string | null>(null);
  const wantFocus = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const inView = (ymd: string) => {
    const m = monthOf(ymd);
    return m.year === month.year && m.month === month.month;
  };
  const tabStop = (focusYmd && inView(focusYmd) && focusYmd) || (inView(today) ? today : monthStart(month));

  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-ymd="${tabStop}"]`)?.focus();
  });

  const moveTo = (ymd: string) => {
    setFocusYmd(ymd);
    if (!inView(ymd)) onMonth(monthOf(ymd));
    wantFocus.current = true;
  };

  const go = (delta: number) => onMonth(fromKey(ymKey(month) + delta));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = (e.target as HTMLElement).dataset?.ymd;
    if (!cur) return;
    const dow = (parseYmd(cur).getUTCDay() + 6) % 7;
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7, Home: -dow, End: 6 - dow };
    if (e.key in step) moveTo(addDaysYmd(cur, step[e.key]));
    else if (e.key === "PageDown" || e.key === "PageUp") moveTo(addMonthsYmd(cur, e.key === "PageDown" ? 1 : -1));
    else return;
    e.preventDefault();
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Mostly sideways and far enough: a swipe. Vertical moves stay page scrolls.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  const legend = (
    <>
      <LegendItem look={ADMIN_DAY_LOOK.free}>Open</LegendItem>
      <LegendItem look={ADMIN_DAY_LOOK.held}>Some sets taken</LegendItem>
      <LegendItem look={ADMIN_DAY_LOOK.booked}>Full</LegendItem>
      <LegendItem look={ADMIN_DAY_LOOK.blocked}>Closed</LegendItem>
      <LegendItem look="cal-today bg-ink-raised">Today</LegendItem>
    </>
  );

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="w-full max-w-[760px]">
      <CalendarShell
        className="max-w-none"
        title={formatMonthYear(month.year, month.month)}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        busy={entries === undefined}
        legend={legend}
        footer={
          <div className="mt-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFocusYmd(today);
                onMonth(monthOf(today));
              }}
            >
              Today
            </Button>
          </div>
        }
      >
        <div ref={gridRef} key={ymKey(month)} className="animate-fade-in">
          <MonthGrid
            year={month.year}
            month={month.month}
            onKeyDown={onKeyDown}
            renderDay={({ ymd }) => {
              const entry = byDate.get(ymd);
              const { look, words, count } = dayState(ymd, entry, today, sets, hours);
              const isToday = ymd === today;
              const inert = entries === undefined || look === "past";
              const isSelected = selected === ymd;
              return (
                <button
                  type="button"
                  data-ymd={ymd}
                  tabIndex={ymd === tabStop ? 0 : -1}
                  aria-label={`${formatLong(ymd)}, ${entries === undefined ? "loading" : words}${isToday ? ", today" : ""}`}
                  aria-disabled={inert || undefined}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setFocusYmd(ymd);
                    if (!inert) onDay(ymd);
                  }}
                  className={cn(
                    dayCell,
                    entries === undefined ? "" : ADMIN_DAY_LOOK[look],
                    isToday && "cal-today",
                    inert && "cursor-default",
                    isSelected && "outline outline-[3px] outline-offset-2 outline-ember",
                  )}
                >
                  <span className="grid justify-items-center leading-none">
                    {parseYmd(ymd).getUTCDate()}
                    {count && entries !== undefined && <span className="mt-1 text-[10px] font-bold opacity-80">{count}</span>}
                  </span>
                </button>
              );
            }}
          />
        </div>
      </CalendarShell>
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-2">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[88px]" />
      ))}
    </div>
  );
}
