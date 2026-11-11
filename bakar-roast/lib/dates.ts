// Date-in-words helpers for YYYY-MM-DD strings. Everything is read as a UTC calendar date,
// so no time zone can shift a day. Words come from our own arrays, not the locale.

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-11-17" to a Date at 00:00 UTC. */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date (UTC) back to "YYYY-MM-DD". */
export function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return toYmd(d);
}

/** "Tue 17 Nov" */
export function formatShort(ymd: string): string {
  const d = parseYmd(ymd);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

/** "Saturday 12 December 2026" */
export function formatLong(ymd: string): string {
  const d = parseYmd(ymd);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** First date from minDate to maxDate (inclusive) not in `unavailable`, or null. */
export function firstOpenDate(a: { minDate: string; maxDate: string; unavailable: string[] }): string | null {
  const taken = new Set(a.unavailable);
  // YYYY-MM-DD compares correctly as a string.
  for (let d = a.minDate; d <= a.maxDate; d = addDaysYmd(d, 1)) {
    if (!taken.has(d)) return d;
  }
  return null;
}

/** "Friday 13 November" (no year), for near dates like a hold or a cancel-by day. */
export function formatDayMonth(ymd: string): string {
  const d = parseYmd(ymd);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "December 2026". `month` is 0-based, as in Date. */
export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/** Today's calendar date in Malaysia, whatever the device's time zone. */
export function klToday(now: Date = new Date()): string {
  return klYmd(now);
}

/** A timestamp (ISO string or Date) as its Malaysia-local calendar date, YYYY-MM-DD. */
export function klYmd(at: string | Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date(at));
}

export type GridDay = { ymd: string; inMonth: boolean };

/**
 * The weeks of a month view, Monday first, padded with the days of the months around it.
 * `month` is 0-based. Shared by the customer calendar and the admin calendar.
 */
export function buildMonthGrid(year: number, month: number): GridDay[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  const start = addDaysYmd(toYmd(first), -lead);
  const weeks: GridDay[][] = [];
  for (let i = 0; i < total; i++) {
    const ymd = addDaysYmd(start, i);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ ymd, inMonth: parseYmd(ymd).getUTCMonth() === month });
  }
  return weeks;
}

/** { year, month } of a YYYY-MM-DD date, month 0-based. */
export function monthOf(ymd: string): { year: number; month: number } {
  const d = parseYmd(ymd);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/** The hour (0 to 23) in Malaysia right now, for greetings. */
export function klHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kuala_Lumpur" }).format(now),
  );
}

/** A timestamp in Malaysia time as "11 Nov, 14:05", for activity logs. */
export function formatStamp(at: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kuala_Lumpur",
  }).formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${Number(get("day"))} ${MONTHS[Number(get("month")) - 1].slice(0, 3)}, ${get("hour")}:${get("minute")}`;
}

/** Add calendar months, clamping to the month's end (2026-08-31 + 6 = 2027-02-28). Mirrors the backend. */
export function addMonthsYmd(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return toYmd(target);
}
