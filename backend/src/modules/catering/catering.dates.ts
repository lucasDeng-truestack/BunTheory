import { BadRequestException } from '@nestjs/common';

/**
 * Calendar-date helpers for catering. A calendar date is a 'YYYY-MM-DD' string,
 * stored in Postgres @db.Date as UTC midnight. Never use local-time getters here.
 */

const DAY_MS = 86_400_000;

const klFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kuala_Lumpur',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's calendar date in Malaysia, 'YYYY-MM-DD'. */
export function klToday(now: Date = new Date()): string {
  return klFormatter.format(now);
}

/** 'YYYY-MM-DD' -> UTC-midnight Date for @db.Date columns. 400 on impossible dates like 2026-02-31. */
export function toDateOnly(value: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(d.getTime()) ||
    d.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException({
      code: 'INVALID_DATE',
      message: 'Please use a real date in YYYY-MM-DD format.',
    });
  }
  return d;
}

/** @db.Date value -> 'YYYY-MM-DD'. */
export function fromDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return fromDateOnly(new Date(toDateOnly(value).getTime() + days * DAY_MS));
}

/** Adds calendar months, clamping to month end (2026-08-31 + 6 = 2027-02-28). */
export function addMonths(value: string, months: number): string {
  const [y, m, d] = value.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return fromDateOnly(target);
}
