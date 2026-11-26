"use client";

import { useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  shopAdminCloseRange,
  shopAdminGetSchedule,
  shopAdminOpenRange,
  shopAdminRangeHours,
  shopAdminUpdateSettings,
  type ShopSchedule,
  type ShopScheduleDay,
} from "@/lib/shop-api";
import { formatDateLabel, slotLabel, timeLabel } from "@/lib/shop";
import { addDaysYmd, addMonthsYmd, formatMonthYear, klToday, monthOf, parseYmd } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Banner, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { TimePicker } from "@/components/admin/time-picker";
import { ADMIN_DAY_LOOK, CalendarShell, LegendItem, MonthGrid, dayCell } from "@/components/booking/calendar";
import { AdminPage, LoadError } from "@/components/admin/admin-page";
import { useAdmin } from "@/components/admin/admin-context";
import { useAdminQuery } from "@/components/admin/use-admin-query";

const SLOT_LENGTHS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "1 hr 30 min" },
  { minutes: 120, label: "2 hours" },
];

const minutesOf = (hhmm: string) => parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(3, 5), 10);
const clockOf = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** The slots customers will see, worked out the same way the server does. */
function previewSlots(start: string, end: string, slotMinutes: number): string[] {
  const out: string[] = [];
  for (let t = minutesOf(start); t + slotMinutes <= minutesOf(end); t += slotMinutes) {
    out.push(`${clockOf(t)}-${clockOf(t + slotMinutes)}`);
  }
  return out;
}

function errMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

/** One numbered step of the setup: what it is for, then its controls. */
function Step({ n, title, lead, children }: { n: number; title: string; lead: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-card-md bg-ink-raised p-4 sm:p-6">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ember text-[15px] font-extrabold text-ink"
        >
          {n}
        </span>
        <div className="grid gap-1">
          <h2 className="m-0 text-lg font-bold">{title}</h2>
          <p className="m-0 text-sm text-cream-muted">{lead}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** A plain-language line that restates what the controls above it will do. */
function Summary({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 rounded-card-sm border border-ink-line px-4 py-3 text-[15px] text-cream">{children}</p>
  );
}

// ─── Steps 1 and 2: ordering dates and time slots (saved together) ───────────

function Setup({ schedule, onSaved }: { schedule: ShopSchedule; onSaved: () => void }) {
  const { run } = useAdmin();
  const from = (s: ShopSchedule) => ({
    earliest: s.earliestDate,
    ordersOpen: s.ordersOpenDate ?? "",
    notice: String(s.minNoticeDays),
    windowDays: String(s.windowDays),
    start: s.defaultHours.start,
    end: s.defaultHours.end,
    slot: s.slotMinutes,
  });
  const [v, setV] = useState(() => from(schedule));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = from(schedule);
  const dirty = (Object.keys(base) as (keyof typeof base)[]).some((k) => v[k] !== base[k]);
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => {
    setV((cur) => ({ ...cur, [key]: value }));
    setSaved(false);
    setError(null);
  };

  const notice = Number(v.notice) || 0;
  const slots = previewSlots(v.start, v.end, v.slot);
  const today = klToday();
  const preOrder = v.ordersOpen !== "" && v.ordersOpen > today;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await run((t) =>
        shopAdminUpdateSettings(t, {
          shopEarliestDate: v.earliest,
          shopOrdersOpenDate: v.ordersOpen, // "" clears it (open now)
          shopMinNoticeDays: Number(v.notice),
          shopWindowDays: Number(v.windowDays),
          shopServeStart: v.start,
          shopServeEnd: v.end,
          shopSlotMinutes: v.slot,
        }),
      );
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Step
        n={1}
        title="When can customers order?"
        lead="Set the day ordering opens and the first day you cook. Pre-orders are simply ordering that opens before your first cooking day."
      >
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Field
            size="sm"
            label="Customers can start ordering on"
            type="date"
            optional
            value={v.ordersOpen}
            onChange={(e) => set("ordersOpen", e.target.value)}
            help="Leave empty to take orders right away."
          />
          <Field
            size="sm"
            label="First day you cook"
            type="date"
            value={v.earliest}
            onChange={(e) => set("earliest", e.target.value)}
            help="Nobody can pick a date before this."
          />
          <Field
            size="sm"
            label="Days of notice you need"
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            value={v.notice}
            onChange={(e) => set("notice", e.target.value)}
            help={
              notice === 0
                ? "0 means customers can order for today."
                : `An order placed today is for ${notice === 1 ? "tomorrow" : `${notice} days from now`} at the earliest.`
            }
          />
          <Field
            size="sm"
            label="How many days ahead they can order"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            value={v.windowDays}
            onChange={(e) => set("windowDays", e.target.value)}
            help="The furthest date a customer can pick, counted from today."
          />
        </div>
        <Summary>
          {preOrder
            ? `Pre-orders open on ${formatDateLabel(v.ordersOpen)}. Until then customers can look but not order.`
            : "Customers can order now."}{" "}
          {v.earliest ? `The first date they can pick is ${formatDateLabel(v.earliest)}` : "Set the first day you cook"}
          {notice > 0 ? `, and always at least ${notice} ${notice === 1 ? "day" : "days"} ahead.` : "."}
        </Summary>
      </Step>

      <Step
        n={2}
        title="What time slots do you offer?"
        lead="Your usual serving hours, cut into slots. You can give single days different hours in step 3."
      >
        <div className="grid items-start gap-4 sm:grid-cols-3">
          <TimePicker label="First slot starts" value={v.start} onChange={(t) => set("start", t)} />
          <TimePicker
            label="Last slot ends"
            value={v.end}
            error={v.end <= v.start ? "Must be after the start." : undefined}
            onChange={(t) => set("end", t)}
          />
          <div className="grid gap-2">
            <span id="slot-length" className="text-[13px] font-semibold text-cream">
              Each slot lasts
            </span>
            <div role="radiogroup" aria-labelledby="slot-length" className="grid grid-cols-2 gap-1.5">
              {SLOT_LENGTHS.map((o) => (
                <button
                  key={o.minutes}
                  type="button"
                  role="radio"
                  aria-checked={v.slot === o.minutes}
                  onClick={() => set("slot", o.minutes)}
                  className={cn(
                    "min-h-11 rounded-card-sm border px-2 text-[13px] font-semibold transition-colors",
                    v.slot === o.minutes
                      ? "border-ember bg-ember text-ink"
                      : "border-cream-faint text-cream hover:border-cream",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <span className="text-[13px] font-semibold">
            {slots.length === 0
              ? "No slot fits in these hours"
              : `Customers will choose from ${slots.length} ${slots.length === 1 ? "slot" : "slots"} (Malaysia time)`}
          </span>
          {slots.length > 0 && (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {slots.map((s) => (
                <li key={s} className="rounded-full border border-cream-faint px-3 py-1.5 text-sm text-cream">
                  {slotLabel(s)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <Banner tone="error" title={error} />}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-line pt-5">
          <Button
            size="sm"
            onClick={() => void save()}
            loading={busy}
            loadingLabel="Saving"
            disabled={!dirty || busy || slots.length === 0}
          >
            Save steps 1 and 2
          </Button>
          {dirty && !busy && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setV(base);
                setError(null);
              }}
            >
              Discard changes
            </Button>
          )}
          <p role="status" className="m-0 text-cream-muted">
            {dirty
              ? "You have changes that are not saved yet."
              : saved
                ? "Saved. The order page uses these now."
                : ""}
          </p>
        </div>
      </Step>
    </>
  );
}

// ─── Step 3: days off and different hours, picked on a calendar ──────────────

type Range = { from: string; to: string };
const monthIndex = (m: { year: number; month: number }) => m.year * 12 + m.month;

function DaysOff({ schedule, onChanged }: { schedule: ShopSchedule; onChanged: () => void }) {
  const { run } = useAdmin();
  const today = klToday();
  const overrides = new Map<string, ShopScheduleDay>(schedule.days.map((d) => [d.date, d]));
  const [view, setView] = useState(() => monthOf(schedule.earliestDate > today ? schedule.earliestDate : today));
  const [sel, setSel] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const firstMonth = monthIndex(monthOf(today));
  const lastMonth = monthIndex(monthOf(addMonthsYmd(today, 12)));
  const step = (by: number) =>
    setView((cur) => {
      const i = monthIndex(cur) + by;
      return { year: Math.floor(i / 12), month: i % 12 };
    });

  /** Tap a day to pick it, tap it again to drop it. Any number of days, in any order. */
  function tap(ymd: string) {
    setMsg(null);
    setSel((cur) => (cur.includes(ymd) ? cur.filter((d) => d !== ymd) : [...cur, ymd].sort()));
  }

  /** The picked days as runs of days in a row, since the server takes a from and a to. */
  function runs(): Range[] {
    const out: Range[] = [];
    for (const d of sel) {
      const last = out[out.length - 1];
      if (last && addDaysYmd(last.to, 1) === d) last.to = d;
      else out.push({ from: d, to: d });
    }
    return out;
  }

  /** Run one change over every picked day (one request per run of days in a row). */
  async function act(label: string, call: (t: string, r: Range) => Promise<unknown>, ok: string) {
    setBusy(label);
    setMsg(null);
    try {
      for (const r of runs()) await run((t) => call(t, r));
      setMsg({ tone: "ok", text: ok });
      setSel([]);
      setReason("");
      onChanged();
    } catch (err) {
      setMsg({ tone: "error", text: errMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  const one = sel.length === 1;
  const selText = one ? formatDateLabel(sel[0]) : `${sel.length} days picked`;
  const usual = `${timeLabel(schedule.defaultHours.start)} to ${timeLabel(schedule.defaultHours.end)}`;

  return (
    <Step
      n={3}
      title="Days off and different hours"
      lead="Tap the days you want to change. Pick as many as you like, in any order, and tap a day again to unpick it. Then choose what to do with them."
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <CalendarShell
          className="bg-ink"
          title={formatMonthYear(view.year, view.month)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          prevDisabled={monthIndex(view) <= firstMonth}
          nextDisabled={monthIndex(view) >= lastMonth}
          legend={
            <>
              <LegendItem look={ADMIN_DAY_LOOK.free}>Usual hours</LegendItem>
              <LegendItem look={ADMIN_DAY_LOOK.held}>Different hours</LegendItem>
              <LegendItem look={ADMIN_DAY_LOOK.blocked}>Day off</LegendItem>
              <LegendItem look="bg-ember/20 outline outline-2 outline-offset-[-2px] outline-ember">Picked</LegendItem>
            </>
          }
        >
          <MonthGrid
            year={view.year}
            month={view.month}
            renderDay={({ ymd }) => {
              const n = parseYmd(ymd).getUTCDate();
              const o = overrides.get(ymd);
              if (ymd < today || ymd < schedule.earliestDate) {
                return (
                  <div
                    aria-label={`${formatDateLabel(ymd)}, ${ymd < today ? "past" : "before your first cooking day"}`}
                    className={cn(dayCell, ADMIN_DAY_LOOK.past, "cursor-not-allowed")}
                  >
                    {n}
                  </div>
                );
              }
              const custom = !!o && !o.closed && (o.serveStart != null || o.serveEnd != null);
              const look = o?.closed ? "blocked" : custom ? "held" : "free";
              const picked = sel.includes(ymd);
              const words = o?.closed
                ? "day off"
                : custom
                  ? `serving ${timeLabel(o!.serveStart ?? schedule.defaultHours.start)} to ${timeLabel(o!.serveEnd ?? schedule.defaultHours.end)}`
                  : "usual hours";
              return (
                <button
                  type="button"
                  onClick={() => tap(ymd)}
                  aria-pressed={picked}
                  aria-label={`${formatDateLabel(ymd)}, ${words}`}
                  className={cn(
                    dayCell,
                    ADMIN_DAY_LOOK[look],
                    // Picked: an ember ring and tint over whatever the day already looks like.
                    picked && "!bg-ember/20 !text-cream outline outline-[3px] outline-offset-[-3px] outline-ember",
                  )}
                >
                  {picked && (
                    <span
                      aria-hidden
                      className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-ember text-ink"
                    >
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                  <span className="grid justify-items-center leading-tight">
                    {n}
                    {custom && (
                      <small className="text-[10px] font-semibold text-cream-muted">
                        {timeLabel(o!.serveStart ?? schedule.defaultHours.start)}
                      </small>
                    )}
                  </span>
                </button>
              );
            }}
          />
        </CalendarShell>

        <div className="grid content-start gap-4">
          {msg && <Banner tone={msg.tone} title={msg.text} />}
          {sel.length === 0 ? (
            <div className="grid gap-3">
              <p className="m-0 text-cream-muted">
                Nothing picked yet. Tap days on the calendar to start. Every day is open {usual} unless you change it here.
              </p>
              <ChangedDays days={schedule.days} schedule={schedule} onPick={(d) => setSel([d])} />
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <b className="text-[17px]">{selText}</b>
                <Button size="sm" variant="ghost" onClick={() => setSel([])} disabled={!!busy}>
                  Clear
                </Button>
              </div>
              {!one && (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {sel.map((d) => (
                    <li key={d}>
                      <button
                        type="button"
                        onClick={() => tap(d)}
                        disabled={!!busy}
                        aria-label={`Unpick ${formatDateLabel(d)}`}
                        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-cream-faint px-3 text-sm text-cream hover:border-cream"
                      >
                        {formatDateLabel(d)}
                        <X aria-hidden size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid gap-3 rounded-card-sm border border-ink-line p-4">
                <b className="text-sm">Take {one ? "this day" : "these days"} off</b>
                <Field
                  size="sm"
                  label="Reason"
                  optional
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Public holiday, away"
                  help="Only you see this."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="cream"
                    disabled={!!busy}
                    loading={busy === "close"}
                    loadingLabel="Closing"
                    onClick={() =>
                      void act(
                        "close",
                        (t, r) => shopAdminCloseRange(t, r.from, r.to, reason || undefined),
                        `${selText}: closed. Customers cannot pick ${one ? "it" : "them"}.`,
                      )
                    }
                  >
                    Close {one ? "this day" : "these days"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!!busy}
                    loading={busy === "open"}
                    loadingLabel="Opening"
                    onClick={() => void act("open", (t, r) => shopAdminOpenRange(t, r.from, r.to), `${selText}: open again.`)}
                  >
                    Open again
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 rounded-card-sm border border-ink-line p-4">
                <b className="text-sm">Serve different hours</b>
                <div className="grid items-start gap-3 sm:grid-cols-2">
                  <TimePicker
                    label="First slot starts"
                    value={start}
                    onChange={setStart}
                    usualLabel={`Usual (${timeLabel(schedule.defaultHours.start)})`}
                  />
                  <TimePicker
                    label="Last slot ends"
                    value={end}
                    onChange={setEnd}
                    usualLabel={`Usual (${timeLabel(schedule.defaultHours.end)})`}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="cream"
                    disabled={!!busy || (start === "" && end === "")}
                    loading={busy === "hours"}
                    loadingLabel="Saving"
                    onClick={() =>
                      void act(
                        "hours",
                        (t, r) => shopAdminRangeHours(t, r.from, r.to, start || null, end || null),
                        `${selText}: serving ${timeLabel(start || schedule.defaultHours.start)} to ${timeLabel(end || schedule.defaultHours.end)}.`,
                      )
                    }
                  >
                    Set these hours
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!!busy}
                    loading={busy === "usual"}
                    loadingLabel="Saving"
                    onClick={() =>
                      void act("usual", (t, r) => shopAdminRangeHours(t, r.from, r.to, null, null), `${selText}: back to ${usual}.`)
                    }
                  >
                    Back to usual hours
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Step>
  );
}

/** The days the owner has changed, as a short list. Tapping one picks it on the calendar. */
function ChangedDays({
  days,
  schedule,
  onPick,
}: {
  days: ShopScheduleDay[];
  schedule: ShopSchedule;
  onPick: (date: string) => void;
}) {
  if (days.length === 0) return null;
  return (
    <div className="grid gap-2">
      <b className="text-sm">Days you have changed</b>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {days.map((d) => (
          <li key={d.date}>
            <button
              type="button"
              onClick={() => onPick(d.date)}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-card-sm border border-ink-line px-4 py-2 text-left hover:border-cream-faint"
            >
              <span className="font-semibold text-cream">{formatDateLabel(d.date)}</span>
              <span className="text-sm text-cream-muted">
                {d.closed
                  ? `Day off${d.note ? ` · ${d.note}` : ""}`
                  : `${timeLabel(d.serveStart ?? schedule.defaultHours.start)} to ${timeLabel(d.serveEnd ?? schedule.defaultHours.end)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShopScheduleScreen() {
  const { data, error, reload } = useAdminQuery((t) => shopAdminGetSchedule(t), []);

  return (
    <AdminPage
      title="Schedule"
      eyebrow="Bakar & Roast"
      lead="Set up ordering in three steps: when customers can order, your time slots, then any days off. All dates and times are Malaysia time (GMT+8)."
    >
      {data === undefined ? (
        error ? (
          <LoadError onRetry={reload} />
        ) : (
          <div className="grid gap-5">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
            <Skeleton className="h-96" />
          </div>
        )
      ) : (
        <div className="grid gap-5">
          <Setup schedule={data} onSaved={reload} />
          <DaysOff schedule={data} onChanged={reload} />
        </div>
      )}
    </AdminPage>
  );
}
