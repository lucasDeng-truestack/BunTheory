export type PosReportRange = 'today' | '7d' | 'all';

export function parseReportRange(raw?: string): PosReportRange {
  if (raw === '7d' || raw === 'all') return raw;
  return 'today';
}

export function reportRangeBounds(range: PosReportRange, now = new Date()) {
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  if (range === 'all') {
    return { gte: undefined as Date | undefined, lt: endOfDay, label: 'all' };
  }

  if (range === '7d') {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
    );
    return { gte: start, lt: endOfDay, label: '7d' };
  }

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  return { gte: startOfDay, lt: endOfDay, label: 'today' };
}

export function createdAtFilter(range: PosReportRange, now = new Date()) {
  const { gte, lt } = reportRangeBounds(range, now);
  if (gte) {
    return { gte, lt };
  }
  return { lt };
}

export function last7DayBuckets(now = new Date()) {
  const buckets: Array<{ date: string; start: Date; end: Date }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    buckets.push({
      date: start.toISOString().slice(0, 10),
      start,
      end,
    });
  }
  return buckets;
}

export function ordersListLimit(range: PosReportRange): number | undefined {
  if (range === 'all') return 200;
  if (range === '7d') return 100;
  return undefined;
}
