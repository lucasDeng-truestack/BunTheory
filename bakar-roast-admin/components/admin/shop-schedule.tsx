"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import {
  shopAdminCloseRange,
  shopAdminGetSchedule,
  shopAdminOpenRange,
  shopAdminRangeHours,
  shopAdminSetDay,
  shopAdminUpdateSettings,
  type ShopSchedule,
  type ShopScheduleDay,
} from "@/lib/shop-api";
import { formatDateLabel } from "@/lib/shop";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { AdminPage, LoadError } from "@/components/admin/admin-page";
import { useAdmin } from "@/components/admin/admin-context";
import { useAdminQuery } from "@/components/admin/use-admin-query";

/** Whole-hour options for the serving-window selects. */
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

/** "15:00" -> "3pm", on-the-hour. */
function hourLabel(hhmm: string): string {
  const h = parseInt(hhmm.slice(0, 2), 10);
  return `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
}

function errMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-card-sm border border-cream-faint p-5">
      <h2 className="type-eyebrow m-0 text-cream-faint">{title}</h2>
      {children}
    </section>
  );
}

// ─── Availability rules ────────────────────────────────────────────────────

function RulesForm({ schedule, onSaved }: { schedule: ShopSchedule; onSaved: () => void }) {
  const { run } = useAdmin();
  const [earliest, setEarliest] = useState(schedule.earliestDate);
  const [ordersOpen, setOrdersOpen] = useState(schedule.ordersOpenDate ?? "");
  const [notice, setNotice] = useState(String(schedule.minNoticeDays));
  const [windowDays, setWindowDays] = useState(String(schedule.windowDays));
  const [start, setStart] = useState(schedule.defaultHours.start);
  const [end, setEnd] = useState(schedule.defaultHours.end);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await run((t) =>
        shopAdminUpdateSettings(t, {
          shopEarliestDate: earliest,
          shopOrdersOpenDate: ordersOpen, // "" clears it (open now)
          shopMinNoticeDays: Number(notice),
          shopWindowDays: Number(windowDays),
          shopServeStart: start,
          shopServeEnd: end,
        }),
      );
      onSaved();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Ordering rules">
      <p className="m-0 text-[13px] text-cream-muted">
        These apply to every day unless a day below overrides them. The picker currently offers{" "}
        {formatDateLabel(schedule.minDate)} to {formatDateLabel(schedule.maxDate)}.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Earliest fulfilment date"
          type="date"
          value={earliest}
          onChange={(e) => setEarliest(e.target.value)}
          help="The first day you can cook for. Nothing before this."
        />
        <Field
          label="Pre-orders open on"
          type="date"
          optional
          value={ordersOpen}
          onChange={(e) => setOrdersOpen(e.target.value)}
          help="Leave empty to accept orders now."
        />
        <Field
          label="Notice buffer (days)"
          type="number"
          inputMode="numeric"
          min={0}
          max={120}
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          help="No orders within this many days of the date."
        />
        <Field
          label="Order window (days ahead)"
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          value={windowDays}
          onChange={(e) => setWindowDays(e.target.value)}
          help="How far ahead customers can order."
        />
        <SelectField label="Serving from" value={start} onChange={(e) => setStart(e.target.value)}>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Serving until" value={end} onChange={(e) => setEnd(e.target.value)}>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </SelectField>
      </div>
      {error && <Banner tone="error" title={error} />}
      <div>
        <Button variant="cream" onClick={save} loading={busy} loadingLabel="Saving" disabled={busy}>
          Save rules
        </Button>
      </div>
    </Card>
  );
}

// ─── Range tools ───────────────────────────────────────────────────────────

function RangeTools({ onChanged }: { onChanged: () => void }) {
  const { run } = useAdmin();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const bothDates = from !== "" && to !== "";

  async function act(label: string, call: (t: string) => Promise<unknown>, ok: string) {
    setBusy(label);
    setMsg(null);
    try {
      await run(call);
      setMsg({ tone: "ok", text: ok });
      onChanged();
    } catch (err) {
      setMsg({ tone: "error", text: errMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="Days off and serving hours">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Field label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <Field
        label="Reason (closing only, your eyes)"
        optional
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Public holiday, fully booked, away"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={!bothDates || !!busy}
          loading={busy === "close"}
          loadingLabel="Closing"
          onClick={() => act("close", (t) => shopAdminCloseRange(t, from, to, reason || undefined), "Those days are closed.")}
        >
          Close these days
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!bothDates || !!busy}
          loading={busy === "open"}
          loadingLabel="Opening"
          onClick={() => act("open", (t) => shopAdminOpenRange(t, from, to), "Those days are open again.")}
        >
          Open these days
        </Button>
      </div>

      <div className="grid gap-4 border-t border-ink-line pt-4 sm:grid-cols-2">
        <SelectField label="Serving from" value={start} onChange={(e) => setStart(e.target.value)}>
          <option value="">Default</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Serving until" value={end} onChange={(e) => setEnd(e.target.value)}>
          <option value="">Default</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </SelectField>
      </div>
      <p className="m-0 text-[13px] text-cream-muted">
        Set the hours for the range above. Leave either as Default to use the usual time.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!bothDates || !!busy}
          loading={busy === "hours"}
          loadingLabel="Saving"
          onClick={() =>
            act(
              "hours",
              (t) => shopAdminRangeHours(t, from, to, start || null, end || null),
              "Serving hours saved for those days.",
            )
          }
        >
          Set these hours
        </Button>
      </div>
      {msg && <Banner tone={msg.tone} title={msg.text} />}
    </Card>
  );
}

// ─── Upcoming overrides ──────────────────────────────────────────────────────

function DayRow({ day, onChanged }: { day: ShopScheduleDay; onChanged: () => void }) {
  const { run } = useAdmin();
  const [busy, setBusy] = useState(false);

  const detail = day.closed
    ? `Closed${day.note ? ` · ${day.note}` : ""}`
    : `Serving ${day.serveStart ? hourLabel(day.serveStart) : "default"} to ${
        day.serveEnd ? hourLabel(day.serveEnd) : "default"
      }`;

  async function reset() {
    setBusy(true);
    try {
      // Reopening a closed day keeps any custom hours it had; "Reset" on an open day with custom
      // hours puts it back to the default. The server drops the row once it holds no override.
      await run((t) =>
        shopAdminSetDay(
          t,
          day.date,
          day.closed ? { closed: false, note: null } : { serveStart: null, serveEnd: null },
        ),
      );
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-line py-2.5 last:border-b-0">
      <div className="grid">
        <span className="font-semibold text-cream">{formatDateLabel(day.date)}</span>
        <span className="text-[13px] text-cream-muted">{detail}</span>
      </div>
      <Button size="sm" variant="ghost" onClick={reset} loading={busy} loadingLabel="…" disabled={busy}>
        {day.closed ? "Open" : "Reset"}
      </Button>
    </div>
  );
}

export function ShopScheduleScreen() {
  const { data, loading, error, reload } = useAdminQuery((t) => shopAdminGetSchedule(t), []);

  return (
    <AdminPage
      title="Schedule"
      eyebrow="Bakar & Roast"
      lead="Set when customers can order, and mark days off or shorter serving hours."
    >
      {error ? (
        <LoadError onRetry={reload} />
      ) : loading && data === undefined ? (
        <div className="grid gap-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      ) : !data ? (
        <LoadError onRetry={reload} />
      ) : (
        <div className="grid gap-5">
          <RulesForm schedule={data} onSaved={reload} />
          <RangeTools onChanged={reload} />
          <Card title="Upcoming changed days">
            {data.days.length === 0 ? (
              <EmptyState title="No changed days">
                Every upcoming day uses the rules above. Close a day or set shorter hours and it shows here.
              </EmptyState>
            ) : (
              <div className="grid">
                {data.days.map((d) => (
                  <DayRow key={d.date} day={d} onChanged={reload} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </AdminPage>
  );
}
