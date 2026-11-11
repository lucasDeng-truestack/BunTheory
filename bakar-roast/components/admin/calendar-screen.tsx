"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, type CateringBookingAdmin, type CateringCalendarDay } from "@/lib/api";
import { adminBlockDate, adminCalendar, adminListBookings, adminUnblockDate } from "@/lib/catering-api";
import { plural } from "@/lib/booking";
import {
  addDaysYmd,
  addMonthsYmd,
  formatLong,
  formatMonthYear,
  klToday,
  monthOf,
  parseYmd,
  toYmd,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
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
type Entry = CateringCalendarDay & { booking?: CateringBookingAdmin };
type Pending = { kind: "block" | "unblock"; ymd: string; reason: string | null } | null;
type Notice = { tone: "ok" | "error"; title: string; help?: string } | null;

const pad = (n: number) => String(n).padStart(2, "0");
const ymKey = (v: Ym) => v.year * 12 + v.month;
const ymText = (v: Ym) => `${v.year}-${pad(v.month + 1)}`;
const fromKey = (k: number): Ym => ({ year: Math.floor(k / 12), month: ((k % 12) + 12) % 12 });
const monthStart = (v: Ym) => `${ymText(v)}-01`;
const monthEnd = (v: Ym) => toYmd(new Date(Date.UTC(v.year, v.month + 1, 0)));
const MONTH_NAME = (v: Ym) => formatMonthYear(v.year, v.month).split(" ")[0];

const STATUS_OF: Record<Exclude<CateringCalendarDay["kind"], "BLOCKED">, CateringBookingAdmin["status"]> = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  COMPLETED: "COMPLETED",
};

/** The look of a day and the words it is read out with. */
function dayState(ymd: string, entry: Entry | undefined, today: string): { look: AdminDayLook; words: string } {
  if (entry?.kind === "PENDING") return { look: "held", words: `held, pending request ${entry.reference ?? ""}`.trim() };
  if (entry?.kind === "APPROVED") return { look: "booked", words: `booked, ${entry.reference ?? ""}`.replace(/, $/, "") };
  if (entry?.kind === "COMPLETED") return { look: "completed", words: `completed, ${entry.reference ?? ""}`.replace(/, $/, "") };
  if (entry?.kind === "BLOCKED") return { look: "blocked", words: entry.reason ? `blocked, ${entry.reason}` : "blocked" };
  return ymd < today ? { look: "past", words: "past" } : { look: "free", words: "free" };
}

/** Join the calendar rows with the bookings for the same range (name, package, guests). */
const join = (days: CateringCalendarDay[], bookings: CateringBookingAdmin[]): Entry[] => {
  const byId = new Map(bookings.map((b) => [b.id, b]));
  return days.map((d) => ({ ...d, booking: d.bookingId ? byId.get(d.bookingId) : undefined }));
};

/**
 * Admin calendar. Month view (grid beside "month at a glance", any month, swipe, Page Up/Down,
 * Today) or List view (today on, 12 months, grouped by month). The view and month ride in the
 * URL so Back from a request lands on the same place.
 */
export function CalendarScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { run } = useAdmin();
  const today = klToday();
  const [view, setViewState] = useState<View>(params.get("view") === "list" ? "list" : "month");
  const [month, setMonthState] = useState<Ym>(() => {
    const m = /^(\d{4})-(\d{2})$/.exec(params.get("month") ?? "");
    return m && +m[2] >= 1 && +m[2] <= 12 ? { year: +m[1], month: +m[2] - 1 } : monthOf(today);
  });
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
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
      const [days, bookings] = await Promise.all([
        adminCalendar(t, range.from, range.to),
        adminListBookings(t, { from: range.from, to: range.to, take: 200 }),
      ]);
      return { key, entries: join(days, bookings) };
    },
    [key],
  );
  // The previous month's data stays in q.data while the next one loads: never draw it on this month.
  const entries = q.data?.key === key ? q.data.entries : undefined;

  const requestHref = (id: string) => `/admin/requests/${id}?from=calendar&${viewQuery(view, month)}`;

  const onDay = (ymd: string, entry: Entry | undefined) => {
    if (!entries) return;
    setNotice(null);
    if (entry?.bookingId) router.push(requestHref(entry.bookingId));
    else if (entry?.kind === "BLOCKED") setPending({ kind: "unblock", ymd, reason: entry.reason });
    else if (ymd >= today) {
      setReason("");
      setPending({ kind: "block", ymd, reason: null });
    }
  };

  const confirm = async () => {
    if (!pending) return;
    const { kind, ymd } = pending;
    setBusy(true);
    try {
      if (kind === "block") await run((t) => adminBlockDate(t, ymd, reason.trim() || undefined));
      else await run((t) => adminUnblockDate(t, ymd));
      setNotice({
        tone: "ok",
        title: kind === "block" ? `${formatLong(ymd)} is blocked.` : `${formatLong(ymd)} is open for bookings again.`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === "DATE_TAKEN")
        setNotice({ tone: "error", title: "That date was just booked or blocked.", help: "The calendar now shows the latest." });
      else if (err instanceof ApiError && err.status === 404)
        setNotice({ tone: "error", title: "That date was already open.", help: "The calendar now shows the latest." });
      else setNotice({ tone: "error", ...describeError(err) });
    } finally {
      setBusy(false);
      setPending(null);
      void q.reload();
    }
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

  return (
    <AdminPage
      title="Calendar"
      actions={toggle}
      lead={
        view === "month"
          ? "Tap a free date to block it. Tap a blocked date to unblock. Tap a booking to open it. Swipe to change month."
          : "Every hold, booking and blocked date from today on."
      }
    >
      {notice && (
        <Banner tone={notice.tone} title={notice.title}>
          {notice.help}
        </Banner>
      )}
      {q.error ? <LoadError onRetry={q.reload} /> : null}

      {view === "month" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
          {entries === undefined && q.data === undefined && !q.error ? (
            <CalendarSkeleton />
          ) : (
            <AdminMonth
              month={month}
              today={today}
              entries={entries}
              onMonth={setMonth}
              onDay={onDay}
            />
          )}
          <section aria-labelledby="glance" className="grid content-start gap-3">
            <h2 id="glance" className="m-0 text-lg font-bold">
              {MONTH_NAME(month)} at a glance
            </h2>
            {entries === undefined ? (
              q.error ? null : <RowsSkeleton />
            ) : entries.length ? (
              <ul className="m-0 grid list-none gap-2 p-0">
                {entries.map((e) => (
                  <EntryRow key={e.date} entry={e} href={requestHref} onUnblock={(x) => onDay(x.date, x)} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing this month.">No holds, bookings or blocked dates.</EmptyState>
            )}
          </section>
        </div>
      ) : entries === undefined ? (
        q.error ? null : <RowsSkeleton />
      ) : entries.length ? (
        <div className="grid max-w-[720px] gap-2">
          {groupByMonth(entries).map(([label, rows]) => (
            <section key={label} aria-label={label} className="grid gap-2">
              <h2 className="m-0 mt-2 text-lg font-bold">{label}</h2>
              <ul className="m-0 grid list-none gap-2 p-0">
                {rows.map((e) => (
                  <EntryRow key={e.date} entry={e} href={requestHref} onUnblock={(x) => onDay(x.date, x)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing on the calendar from today on.">No holds, bookings or blocked dates.</EmptyState>
      )}

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.kind === "unblock" ? "Unblock this date?" : "Block this date?"}
        description={
          pending
            ? pending.kind === "block"
              ? `Nobody will be able to book ${formatLong(pending.ymd)}.`
              : `${formatLong(pending.ymd)} will open for bookings again.`
            : undefined
        }
        confirmLabel={pending?.kind === "unblock" ? "Yes, unblock" : "Block the date"}
        cancelLabel={pending?.kind === "unblock" ? "Keep it blocked" : "Leave it open"}
        onConfirm={confirm}
        confirmLoading={busy}
        confirmLoadingLabel={pending?.kind === "unblock" ? "Unblocking" : "Blocking"}
      >
        {pending?.kind === "block" && (
          <Field
            size="sm"
            label="Reason"
            optional
            help="Only you see this."
            maxLength={200}
            autoComplete="off"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!busy) void confirm();
              }
            }}
          />
        )}
        {pending?.kind === "unblock" && (
          <p className="m-0 [overflow-wrap:anywhere]">
            <span className="text-cream-muted">Reason: </span>
            {pending.reason || "No reason given."}
          </p>
        )}
      </Dialog>
    </AdminPage>
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

/** One hold, booking or blocked date: date block, what it is, and its action. */
function EntryRow({
  entry: e,
  href,
  onUnblock,
}: {
  entry: Entry;
  href: (bookingId: string) => string;
  onUnblock: (e: Entry) => void;
}) {
  if (e.kind === "BLOCKED") {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-ink-raised p-3">
        <span className="flex min-w-0 items-center gap-3">
          <DateBlock ymd={e.date} />
          <span className="grid min-w-0 gap-0.5">
            <b className="text-base">Blocked</b>
            <span className="text-[13px] text-cream-muted [overflow-wrap:anywhere]">{e.reason || "No reason given."}</span>
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={() => onUnblock(e)} aria-label={`Unblock ${formatLong(e.date)}`}>
          Unblock
        </Button>
      </li>
    );
  }
  const b = e.booking;
  return (
    <li>
      <Link
        href={e.bookingId ? href(e.bookingId) : "/admin/requests"}
        className="flex items-center justify-between gap-3 rounded-card-sm bg-ink-raised p-3 text-cream no-underline hover:shadow-[inset_0_0_0_1px_theme(colors.cream.faint)]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <DateBlock ymd={e.date} />
          <span className="grid min-w-0 gap-0.5">
            <b className="text-base [overflow-wrap:anywhere]">{b?.customerName ?? e.reference}</b>
            {b && (
              <span className="text-[13px] text-cream-muted [overflow-wrap:anywhere]">
                {b.packageName} · {plural(b.guests, "guest")}
              </span>
            )}
            {b && <span className="text-xs font-bold tracking-[0.04em] text-cream-muted">{e.reference}</span>}
          </span>
        </span>
        <StatusChip status={b?.status ?? STATUS_OF[e.kind]} className="flex-none" />
      </Link>
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
  onMonth,
  onDay,
}: {
  month: Ym;
  today: string;
  entries: Entry[] | undefined;
  onMonth: (m: Ym) => void;
  onDay: (ymd: string, entry: Entry | undefined) => void;
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
      <LegendItem look={ADMIN_DAY_LOOK.held}>Held (pending)</LegendItem>
      <LegendItem look={ADMIN_DAY_LOOK.booked}>Booked (approved)</LegendItem>
      <LegendItem look={ADMIN_DAY_LOOK.completed}>Completed</LegendItem>
      <LegendItem look={ADMIN_DAY_LOOK.blocked}>Blocked</LegendItem>
      <LegendItem look={ADMIN_DAY_LOOK.free}>Free</LegendItem>
      <LegendItem look="cal-today bg-ink-raised">Today</LegendItem>
    </>
  );

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="w-full max-w-[520px]">
      <CalendarShell
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
              const { look, words } = dayState(ymd, entry, today);
              const isToday = ymd === today;
              const inert = entries === undefined || look === "past";
              return (
                <button
                  type="button"
                  data-ymd={ymd}
                  tabIndex={ymd === tabStop ? 0 : -1}
                  aria-label={`${formatLong(ymd)}, ${entries === undefined ? "loading" : words}${isToday ? ", today" : ""}`}
                  aria-disabled={inert || undefined}
                  onClick={() => {
                    setFocusYmd(ymd);
                    if (!inert) onDay(ymd, entry);
                  }}
                  className={cn(dayCell, entries === undefined ? "" : ADMIN_DAY_LOOK[look], isToday && "cal-today", inert && "cursor-default")}
                >
                  {parseYmd(ymd).getUTCDate()}
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
