import type { Order, OrderStatus } from "@/types/order";

export type DateRangeFilter = "today" | "week" | "month" | "all";

/** Local calendar date key YYYY-MM-DD */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function orderTotal(order: Order): number {
  return order.orderItems.reduce((sum, oi) => {
    const unit = Number(oi.unitPrice ?? oi.menu?.price ?? 0);
    if (Number.isNaN(unit)) return sum;
    return sum + unit * oi.quantity;
  }, 0);
}

export function countByStatus(orders: Order[], status: OrderStatus): number {
  return orders.filter((o) => o.status === status).length;
}

export function uniqueCustomers(orders: Order[]): number {
  return new Set(
    orders.map((o) => o.phone.replace(/\D/g, "") || o.phone)
  ).size;
}

export function topItems(
  orders: Order[],
  limit = 5
): { name: string; menuId: string; qty: number }[] {
  const acc = new Map<string, { name: string; qty: number }>();
  for (const o of orders) {
    for (const oi of o.orderItems) {
      const id = oi.menuId ?? oi.id;
      const name = oi.menu?.name ?? "Item";
      const cur = acc.get(id) ?? { name, qty: 0 };
      cur.qty += oi.quantity;
      acc.set(id, cur);
    }
  }
  return Array.from(acc.entries())
    .map(([menuId, v]) => ({ menuId, name: v.name, qty: v.qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

export interface RevenueBucket {
  label: string;
  key: string;
  total: number;
  highlight?: boolean;
}

/** Map each order date to total revenue for that local day */
function revenueByLocalDay(orders: Order[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const key = toLocalDateKey(d);
    map.set(key, (map.get(key) ?? 0) + orderTotal(o));
  }
  return map;
}

export function buildRevenueBuckets(
  orders: Order[],
  range: DateRangeFilter
): RevenueBucket[] {
  const byDay = revenueByLocalDay(orders);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === "today") {
    const key = toLocalDateKey(todayStart);
    const total = orders.reduce((s, o) => s + orderTotal(o), 0);
    return [{ label: "Today", key, total, highlight: true }];
  }

  if (range === "week") {
    const buckets: RevenueBucket[] = [];
    const todayKey = toLocalDateKey(todayStart);
    for (let i = 6; i >= 0; i--) {
      const day = new Date(todayStart);
      day.setDate(day.getDate() - i);
      const key = toLocalDateKey(day);
      buckets.push({
        label: day.toLocaleDateString(undefined, { weekday: "short" }),
        key,
        total: byDay.get(key) ?? 0,
        highlight: key === todayKey,
      });
    }
    return buckets;
  }

  if (range === "month") {
    const buckets: RevenueBucket[] = [];
    for (let chunk = 5; chunk >= 0; chunk--) {
      let sum = 0;
      let first: Date | null = null;
      let last: Date | null = null;
      for (let d = 0; d < 5; d++) {
        const day = new Date(todayStart);
        day.setDate(day.getDate() - (chunk * 5 + d));
        if (!first) first = day;
        last = day;
        const key = toLocalDateKey(day);
        sum += byDay.get(key) ?? 0;
      }
      const label =
        first && last
          ? `${first.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}–${last.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}`
          : "";
      buckets.push({
        label,
        key: `m${chunk}`,
        total: sum,
        highlight: chunk === 0,
      });
    }
    return buckets;
  }

  // all — group by calendar month present in data
  const byMonth = new Map<string, number>();
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + orderTotal(o));
  }
  const sorted = Array.from(byMonth.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const last = sorted.slice(-10);
  return last.map(([mk, total]) => {
    const [y, m] = mk.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return {
      label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      key: mk,
      total,
      highlight: false,
    };
  });
}

export function formatRelativeShort(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
