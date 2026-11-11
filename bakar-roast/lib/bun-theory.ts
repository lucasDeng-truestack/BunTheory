// Pure Bun Theory admin helpers, ported from frontend/lib (constants, order-payment-labels,
// receipt-url, order-item-display) with the same behaviour, plus the order money and list
// helpers the orders, board, batches and menu screens share. No React. Money is integer cents.
import type {
  BunTheorySettings,
  CanOrderResponse,
  MenuItem,
  MenuItemInput,
  Order,
  OrderBatch,
  OrderItem,
  OrderStatus,
} from "./bun-theory-api";
import { centsToAmount, toCents, UPLOAD_MAX_BYTES } from "./admin";
import { addDaysYmd, klYmd } from "./dates";

// ─── Statuses (frontend/lib/constants.ts) ────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: "Received",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  PICKED_UP: "Picked up",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** The quick picker on the orders list. */
export const ORDER_STATUS_STEPS: OrderStatus[] = ["RECEIVED", "PREPARING", "READY", "DELIVERED"];

/** Every status, for the order detail picker. */
export const ALL_ORDER_STATUSES: OrderStatus[] = [
  "RECEIVED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "PICKED_UP",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

/** The list picker's steps, plus the order's own status when it is not one of them. */
export const listStatusOptions = (current: OrderStatus): OrderStatus[] =>
  ORDER_STATUS_STEPS.includes(current) ? ORDER_STATUS_STEPS : ALL_ORDER_STATUSES.filter((s) => ORDER_STATUS_STEPS.includes(s) || s === current);

// ─── Payment (frontend/lib/order-payment-labels.ts) ──────────────────────────

export function paymentChoiceLabel(order: Pick<Order, "paymentChoice">): string {
  if (order.paymentChoice === "PAY_NOW") return "Pay now";
  if (order.paymentChoice === "PAY_LATER") return "Pay later";
  return "—";
}

/** Receipt upload status for display (Pay later is not applicable). */
export function receiptStatusLabel(order: Pick<Order, "paymentChoice" | "paymentReceiptUrl">): string {
  if (order.paymentChoice === "PAY_LATER") return "N/A";
  if (order.paymentChoice === "PAY_NOW") {
    return order.paymentReceiptUrl?.trim() ? "Received" : "Awaiting receipt";
  }
  return "—";
}

/** True when the stored receipt URL points at a PDF (frontend/lib/receipt-url.ts). */
export function isPdfReceiptUrl(url: string): boolean {
  const path = url.trim().split("?")[0] ?? "";
  return /\.pdf$/i.test(path);
}

// ─── Line items (frontend/lib/order-item-display.ts) ─────────────────────────

type OptionsSnap = {
  summary?: string[];
  detail?: Array<{ groupName?: string; label?: string }>;
};

/** Readable option lines from checkout (`summary`, or `detail` as fallback). */
export function getSelectedOptionLines(oi: Pick<OrderItem, "selectedOptions">): string[] {
  const snap = oi.selectedOptions as OptionsSnap | null | undefined;
  if (snap?.summary?.length) {
    return snap.summary.filter((s): s is string => Boolean(s?.trim()));
  }
  if (snap?.detail?.length) {
    return snap.detail
      .map((d) => {
        if (d.groupName?.trim() && d.label?.trim()) return `${d.groupName.trim()}: ${d.label.trim()}`;
        return d.label?.trim() ?? "";
      })
      .filter(Boolean);
  }
  return [];
}

// ─── Money (integer cents) ───────────────────────────────────────────────────

/** A Decimal string, number or nullish to cents; null when missing or not a number. */
export function moneyCents(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Unit price at order time, falling back to today's menu price (as the old receipt did). */
export const unitCents = (oi: OrderItem) => moneyCents(oi.unitPrice ?? oi.menu?.price);

export function lineCents(oi: OrderItem): number | null {
  const u = unitCents(oi);
  return u === null ? null : u * oi.quantity;
}

/** Sum of the line items, or null when any line has no price. */
export function lineSumCents(order: Pick<Order, "orderItems">): number | null {
  let sum = 0;
  for (const oi of order.orderItems) {
    const c = lineCents(oi);
    if (c === null) return null;
    sum += c;
  }
  return sum;
}

/** What the customer should have paid: the stored total, else the line sum (legacy orders). */
export function expectedTotalCents(order: Order): number {
  return moneyCents(order.total) ?? lineSumCents(order) ?? 0;
}

export type MoneyRow = { label: string; cents: number; note?: boolean };

/**
 * The money breakdown: subtotal, fees above zero, total, then the tax already inside the total
 * (Malaysian SST style, never added on top). Legacy orders with no stored total show the line sum.
 */
export function moneyBreakdown(order: Order): { rows: MoneyRow[]; totalCents: number | null; taxCents: number | null } {
  const lines = lineSumCents(order);
  const total = moneyCents(order.total);
  if (total === null) return { rows: [], totalCents: lines, taxCents: null };
  const rows: MoneyRow[] = [];
  const subtotal = moneyCents(order.subtotal) ?? lines;
  if (subtotal !== null) rows.push({ label: "Subtotal", cents: subtotal });
  const delivery = moneyCents(order.deliveryFee);
  if (delivery) rows.push({ label: "Delivery fee", cents: delivery });
  const processing = moneyCents(order.processingFee);
  if (processing) rows.push({ label: "Processing fee", cents: processing });
  const tax = moneyCents(order.taxAmount);
  return { rows, totalCents: total, taxCents: tax || null };
}

// ─── Orders list ─────────────────────────────────────────────────────────────

export const orderRef = (o: Pick<Order, "id" | "slugId">) => o.slugId ?? o.id.slice(0, 8);

/** The batch on an order row: its label, or the short id. */
export const orderBatchName = (o: Pick<Order, "batch" | "batchId">) =>
  o.batch?.label?.trim() || (o.batchId ? o.batchId.slice(0, 8) : "—");

/** A batch in the filter: its label, or "2026-11-14 · PUBLISHED". */
export const batchOptionLabel = (b: Pick<OrderBatch, "label" | "fulfillmentDate" | "status">) =>
  b.label?.trim() || `${b.fulfillmentDate.slice(0, 10)} · ${b.status}`;

/** Total quantity per menu item across the orders on screen (what to make). */
export function makeList(orders: Order[]): { id: string; name: string; qty: number }[] {
  const acc = new Map<string, { id: string; name: string; qty: number }>();
  for (const order of orders) {
    for (const oi of order.orderItems) {
      const id = oi.menuId ?? oi.id;
      const row = acc.get(id) ?? { id, name: oi.menu?.name ?? "Unknown", qty: 0 };
      row.qty += oi.quantity;
      acc.set(id, row);
    }
  }
  return [...acc.values()];
}

export type OrderDate = "today" | "week" | "month" | "all";
export const ORDER_DATES: { value: OrderDate; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "all", label: "All time" },
];
export const asOrderDate = (v: string | null | undefined): OrderDate =>
  v === "today" || v === "month" || v === "all" ? v : "week";

/** An order time in Malaysia: "11 Nov 2026, 2:05 pm". */
export function formatOrderTime(at: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(at));
}

/** The WhatsApp opener to a customer about their order. */
export const orderWaMessage = (first: string, ref: string) =>
  `Hi${first ? ` ${first}` : ""}, this is The Bun Theory about your order ${ref}.`;

/** An order's clock time in Malaysia: "2:05 pm" (the live board cards). */
export function formatOrderClock(at: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(at));
}

// ─── Live board (frontend/lib/order-workflow.ts) ─────────────────────────────

/** Statuses that leave the live board. */
export const TERMINAL_STATUSES: OrderStatus[] = ["DELIVERED", "COMPLETED", "CANCELLED"];

export const isTerminal = (status: OrderStatus) => TERMINAL_STATUSES.includes(status);

/** The one-tap flow, by order type. */
const flowFor = (type: Order["type"]): OrderStatus[] =>
  type === "DELIVERY"
    ? ["RECEIVED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"]
    : ["RECEIVED", "PREPARING", "READY", "PICKED_UP", "COMPLETED"];

/** The status the advance button moves to, or null at the end of the flow. */
export function nextOrderStatus(type: Order["type"], current: OrderStatus): OrderStatus | null {
  const flow = flowFor(type);
  const i = flow.indexOf(current);
  if (i === -1 || i >= flow.length - 1) return null;
  return flow[i + 1];
}

/** The advance button's label. */
export function advanceLabel(type: Order["type"], current: OrderStatus): string | null {
  const next = nextOrderStatus(type, current);
  if (!next) return null;
  switch (next) {
    case "PREPARING":
      return "Start preparing";
    case "READY":
      return "Mark ready";
    case "OUT_FOR_DELIVERY":
      return "Out for delivery";
    case "PICKED_UP":
      return "Mark picked up";
    case "COMPLETED":
      return "Complete order";
    default:
      return "Advance";
  }
}

export type BoardColumn = { key: string; title: string; statuses: OrderStatus[] };

/** The board columns (active orders only). */
export const BOARD_COLUMNS: BoardColumn[] = [
  { key: "new", title: "New", statuses: ["RECEIVED"] },
  { key: "preparing", title: "Preparing", statuses: ["PREPARING"] },
  { key: "ready", title: "Ready", statuses: ["READY"] },
  { key: "handover", title: "Out or picked up", statuses: ["OUT_FOR_DELIVERY", "PICKED_UP"] },
];

// ─── Batch times (Malaysia, UTC+8 all year) ──────────────────────────────────
// The form's datetime-local fields are read and written as Malaysia wall time, so the form and
// the list agree on any device. On a device set to Malaysia this sends exactly what the old
// screen sent (new Date(local).toISOString()).

const KL_OFFSET = "+08:00";

/** An instant to "YYYY-MM-DDTHH:mm" in Malaysia, for a datetime-local field. */
export function toKlDatetimeLocal(at: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kuala_Lumpur",
  }).formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** A datetime-local value read as Malaysia time. Null when empty or not a date. */
export function fromKlDatetimeLocal(v: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?/.exec(v.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}${m[2] ?? ":00"}${KL_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const klDay = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kuala_Lumpur",
});
const klClock = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kuala_Lumpur",
});

/** A batch window in Malaysia: "Sat 14 Nov, 11:00 am to 3:00 pm", or both days when it spans two. */
export function formatBatchWindow(b: Pick<OrderBatch, "opensAt" | "closesAt">): string {
  const a = new Date(b.opensAt);
  const z = new Date(b.closesAt);
  const dayA = klDay.format(a);
  const dayZ = klDay.format(z);
  return dayA === dayZ
    ? `${dayA}, ${klClock.format(a)} to ${klClock.format(z)}`
    : `${dayA}, ${klClock.format(a)} to ${dayZ}, ${klClock.format(z)}`;
}

// ─── Menu (frontend/components/admin/admin-menu-item-dialog.tsx) ─────────────
// Prices go through toCents (./admin), never float maths.

/** Digits and one dot, at most two decimals (frontend/lib/sanitize-input.ts sanitizeMoneyInput). */
export function sanitizeMoneyText(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  const whole = cleaned.slice(0, dot);
  const decimals = cleaned.slice(dot + 1).replace(/\D/g, "").slice(0, 2);
  return `${whole || "0"}.${decimals}`;
}

/** Digits only (sanitizeIntegerInput). */
export const sanitizeIntText = (value: string) => value.replace(/\D/g, "");

/** Cents to the RM text a price field starts with: "12", "12.90". */
export const centsText = (cents: number) =>
  cents % 100 === 0 ? String(cents / 100) : `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;

export type MenuOptionDraft = { key: number; label: string; priceDelta: string };
export type MenuGroupDraft = { key: number; name: string; required: boolean; multiSelect: boolean; options: MenuOptionDraft[] };
export type MenuItemDraft = {
  name: string;
  description: string;
  price: string;
  maxQuantity: string;
  category: string;
  isFavorite: boolean;
  available: boolean;
  soldOut: boolean;
  /** The stored URL, sent back as it is. */
  image: string;
  groups: MenuGroupDraft[];
};

/** The form for an item, or a blank one (available, not sold out, no groups, as the old dialog). */
export function toMenuDraft(item?: MenuItem, nextKey: () => number = counter()): MenuItemDraft {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item ? centsText(moneyCents(item.price) ?? 0) : "",
    maxQuantity: item?.maxQuantity != null ? String(item.maxQuantity) : "",
    category: item?.category ?? "",
    isFavorite: item?.isFavorite ?? false,
    available: item?.available ?? true,
    soldOut: item?.soldOut ?? false,
    image: item?.image ?? "",
    groups: (item?.optionGroups ?? []).map((g) => ({
      key: nextKey(),
      name: g.name,
      required: g.required,
      multiSelect: g.multiSelect,
      options: (g.options.length ? g.options : [{ label: "", priceDelta: 0 }]).map((o) => ({
        key: nextKey(),
        label: o.label,
        priceDelta: centsText(moneyCents(o.priceDelta) ?? 0),
      })),
    })),
  };
}

/** A key source for draft rows (stable React keys while rows are added and removed). */
export function counter(start = 0) {
  let n = start;
  return () => n++;
}

export type MenuItemErrors = {
  name?: string;
  price?: string;
  /** By group key. */
  groups?: Record<number, string>;
  /** By option key. */
  options?: Record<number, string>;
};

const AMOUNT_HELP = "Enter an amount like 12 or 12.90.";

/**
 * The old dialog's body, with the same rules: name and price are required (0 is a price), an
 * empty extra price is 0, options without a label and groups without a name or options are left
 * out, and an empty cap is null on edit and left out on create. Description and image stay
 * undefined when empty, so clearing them on edit changes nothing (as before).
 * Added: a group that has options but no name, or a name but no options, is an error instead of
 * being dropped without a word.
 */
export function validateMenuItem(d: MenuItemDraft, editing: boolean): { errors: MenuItemErrors; input: MenuItemInput | null } {
  const errors: MenuItemErrors = {};
  if (!d.name.trim()) errors.name = "Enter the item's name.";
  const price = toCents(d.price);
  if (price === null) errors.price = "Enter a price. Use 0 for a free item.";
  else if (Number.isNaN(price)) errors.price = AMOUNT_HELP;

  const groupErrors: Record<number, string> = {};
  const optionErrors: Record<number, string> = {};
  const optionGroups: MenuItemInput["optionGroups"] = [];
  for (const g of d.groups) {
    const options: { label: string; priceDelta: number }[] = [];
    for (const o of g.options) {
      if (!o.label.trim()) continue;
      const cents = toCents(o.priceDelta);
      if (Number.isNaN(cents)) optionErrors[o.key] = AMOUNT_HELP;
      else options.push({ label: o.label.trim(), priceDelta: centsToAmount(cents ?? 0) });
    }
    const name = g.name.trim();
    const labelled = g.options.some((o) => o.label.trim());
    if (!name && labelled) groupErrors[g.key] = "Name this group, or remove it.";
    else if (name && !labelled) groupErrors[g.key] = "Add at least one option, or remove the group.";
    if (name && options.length) optionGroups.push({ name, required: g.required, multiSelect: g.multiSelect, options });
  }
  if (Object.keys(groupErrors).length) errors.groups = groupErrors;
  if (Object.keys(optionErrors).length) errors.options = optionErrors;
  if (errors.name || errors.price || errors.groups || errors.options || price === null || Number.isNaN(price)) {
    return { errors, input: null };
  }

  const input: MenuItemInput = {
    name: d.name.trim(),
    // On edit an empty value is sent as "" so clearing it saves (the backend stores null).
    description: d.description.trim() || (editing ? "" : undefined),
    price: centsToAmount(price),
    isFavorite: d.isFavorite,
    available: d.available,
    soldOut: d.soldOut,
    category: d.category.trim() || null,
    image: d.image || (editing ? "" : undefined),
    optionGroups,
  };
  const cap = d.maxQuantity.trim();
  if (cap) input.maxQuantity = parseInt(cap, 10);
  else if (editing) input.maxQuantity = null;
  return { errors, input };
}

/** What the list says about an item: "Sold out", "Available" or "Hidden" (as the old card). */
export const menuItemState = (i: Pick<MenuItem, "soldOut" | "available">) =>
  i.soldOut ? "Sold out" : i.available ? "Available" : "Hidden";

/**
 * Old uploads were saved with the API's full local URL, port included (localhost:3001 before the
 * move to 3101). For display only, turn a localhost "/uploads/..." URL back into its path so
 * imageSrc() points it at today's API. Anything else is returned as it is. Never save the result.
 */
export function localUploadPath(url: string | null | undefined): string {
  if (!url) return "";
  const m = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/[^?#]+)/i.exec(url);
  return m ? m[1] : url;
}

// ─── Overview (frontend/lib/dashboard-metrics.ts, in cents and Malaysia dates) ───────────────
// Same numbers as the old dashboard: revenue is the line-item sum (unit price at order time, else
// today's menu price, times quantity; a line without a price counts 0), not the stored total.
// Days and months are Malaysia calendar dates instead of the device's own zone.

/** The old dashboard's order total: line items only, a missing price is 0. */
export function orderLineCents(order: Pick<Order, "orderItems">): number {
  return order.orderItems.reduce((sum, oi) => sum + (unitCents(oi) ?? 0) * oi.quantity, 0);
}

export const revenueCents = (orders: Pick<Order, "orderItems">[]) => orders.reduce((s, o) => s + orderLineCents(o), 0);

export const countByStatus = (orders: Pick<Order, "status">[], status: OrderStatus) => orders.filter((o) => o.status === status).length;

/** Customers by phone digits (the raw phone when it has none). */
export const uniqueCustomers = (orders: Pick<Order, "phone">[]) => new Set(orders.map((o) => o.phone.replace(/\D/g, "") || o.phone)).size;

/** Average order value in whole cents, 0 with no orders. */
export const averageCents = (totalCents: number, count: number) => (count > 0 ? Math.round(totalCents / count) : 0);

/** The five best sellers by quantity. */
export const topItems = (orders: Order[], limit = 5) => makeList(orders).sort((a, b) => b.qty - a.qty).slice(0, limit);

export type RevenueBucket = { key: string; label: string; /** The table and screen-reader label: "Wed 11 November". */ long: string; cents: number; highlight: boolean };

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ymdParts = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};
const dayMonth = (ymd: string) => {
  const p = ymdParts(ymd);
  return `${p.d} ${MONTH_SHORT[p.m - 1]}`;
};
/** "7 to 11 Nov", or "30 Oct to 3 Nov" across a month end. */
const dayRange = (from: string, to: string) => {
  const a = ymdParts(from);
  const z = ymdParts(to);
  return a.m === z.m ? `${a.d} to ${z.d} ${MONTH_SHORT[z.m - 1]}` : `${dayMonth(from)} to ${dayMonth(to)}`;
};

/**
 * The revenue chart's bars for a range: today is one bar; the last 7 days one bar per day; the last
 * 30 days six bars of five days; all time one bar per month that has orders (the latest ten).
 * `today` is the Malaysia date (klToday()).
 */
export function revenueBuckets(orders: Order[], range: OrderDate, today: string): RevenueBucket[] {
  const byDay = new Map<string, number>();
  for (const o of orders) {
    const key = klYmd(o.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + orderLineCents(o));
  }

  if (range === "today") {
    return [{ key: today, label: "Today", long: "Today", cents: revenueCents(orders), highlight: true }];
  }

  if (range === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDaysYmd(today, i - 6);
      const p = ymdParts(key);
      return {
        key,
        label: WEEKDAY_SHORT[p.weekday],
        long: `${WEEKDAY_SHORT[p.weekday]} ${p.d} ${MONTH_LONG[p.m - 1]}`,
        cents: byDay.get(key) ?? 0,
        highlight: key === today,
      };
    });
  }

  if (range === "month") {
    return Array.from({ length: 6 }, (_, i) => {
      const chunk = 5 - i;
      const last = addDaysYmd(today, -chunk * 5);
      const first = addDaysYmd(last, -4);
      let cents = 0;
      for (let d = 0; d < 5; d++) cents += byDay.get(addDaysYmd(last, -d)) ?? 0;
      const label = dayRange(first, last);
      return { key: `m${chunk}`, label, long: label, cents, highlight: chunk === 0 };
    });
  }

  const byMonth = new Map<string, number>();
  for (const [day, cents] of byDay) {
    const mk = day.slice(0, 7);
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + cents);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-10)
    .map(([mk, cents]) => {
      const [y, m] = mk.split("-").map(Number);
      return { key: mk, label: `${MONTH_SHORT[m - 1]} ${y}`, long: `${MONTH_LONG[m - 1]} ${y}`, cents, highlight: false };
    });
}

/** "Just now", "5 min ago", "3h ago", "2d ago", then "4 Nov" (Malaysia date). */
export function formatRelativeShort(at: string, now: number = Date.now()): string {
  const m = Math.floor((now - new Date(at).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return dayMonth(klYmd(at));
}

/** The kitchen load subtitle: "Lunch · 11:00 am to 3:00 pm", or why nothing is open. */
export function formatBatchLabel(ctx: Pick<CanOrderResponse, "activeBatch" | "reason">): string | null {
  const b = ctx.activeBatch;
  if (!b) {
    if (ctx.reason === "NO_BATCH") return "No batch open";
    if (ctx.reason === "DISABLED") return "Ordering is off";
    return null;
  }
  const name = b.label?.trim() || "Order batch";
  return `${name} · ${klClock.format(new Date(b.opensAt))} to ${klClock.format(new Date(b.closesAt))}`;
}

/** Load as a whole percent of the batch limit, capped at 100 for the bar (0 with no limit). */
export const loadPercent = (current: number, max: number) => (max > 0 ? Math.round((current / max) * 100) : 0);

// ─── Payment QR upload ───────────────────────────────────────────────────────
// The QR also takes SVG (the old settings page and the API allow it), so it has its own check.

export const QR_UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg";
export const QR_UPLOAD_RULE = "Use a PNG, JPG, WebP or SVG image up to 5 MB.";

export function qrUploadProblem(file: { name: string; type: string; size: number }): string | null {
  const okType = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"].includes(file.type.toLowerCase());
  const okExt = /\.(jpe?g|png|webp|svg)$/i.test(file.name);
  return okType && okExt && file.size > 0 && file.size <= UPLOAD_MAX_BYTES ? null : QR_UPLOAD_RULE;
}

// ─── Bun Theory settings (frontend/app/admin/settings, settings-card, outlet-settings-card) ──
// Each field saves on its own. The text a field shows for a stored value, and what typed text
// sends, with the old page's rules and the DTO's limits (backend/src/modules/settings/dto).

export type SettingKey =
  | "maxOrdersPerDay"
  | "minimumDeliveryAmount"
  | "outletName"
  | "outletAddress"
  | "prepTimeMinutes"
  | "deliveryFee"
  | "processingFee"
  | "taxRatePercent"
  | "deliveryRadiusNote";

type SettingsRow = Pick<BunTheorySettings, SettingKey>;

/** The PATCH body for one field. */
export type SettingBody = Partial<{
  maxOrdersPerDay: number;
  minimumDeliveryAmount: number | null;
  outletName: string;
  outletAddress: string;
  prepTimeMinutes: number | null;
  deliveryFee: number | null;
  processingFee: number | null;
  taxRatePercent: number;
  deliveryRadiusNote: string;
}>;

const amountText = (v: number | null | undefined) => {
  const c = moneyCents(v);
  return c === null ? "" : centsText(c);
};

/** Tax with no stored value reads 6, as the old page (the column defaults to 6). */
const DEFAULT_TAX = 6;

/** What a field shows for the stored settings. */
export function settingText(key: SettingKey, s: SettingsRow): string {
  switch (key) {
    case "maxOrdersPerDay":
      return String(s.maxOrdersPerDay);
    case "prepTimeMinutes":
      return s.prepTimeMinutes != null ? String(s.prepTimeMinutes) : "";
    case "minimumDeliveryAmount":
    case "deliveryFee":
    case "processingFee":
      return amountText(s[key]);
    case "taxRatePercent":
      return String(s.taxRatePercent ?? DEFAULT_TAX);
    default:
      return (s[key] ?? "").trim();
  }
}

export type SettingParse = { error: string } | { text: string; body: SettingBody };

const AMOUNT_RULE = "Enter an amount like 5 or 5.50.";

/** Typed text to the body to send, or the message when it would be refused. Text is trimmed. */
export function parseSetting(key: SettingKey, raw: string): SettingParse {
  const v = raw.trim();
  switch (key) {
    case "maxOrdersPerDay": {
      if (!/^\d+$/.test(v) || parseInt(v, 10) < 1) return { error: "Enter a whole number, 1 or more." };
      const n = parseInt(v, 10);
      return { text: String(n), body: { maxOrdersPerDay: n } };
    }
    case "prepTimeMinutes": {
      if (!v) return { text: "", body: { prepTimeMinutes: null } };
      if (!/^\d+$/.test(v) || parseInt(v, 10) > 600) return { error: "Enter minutes from 0 to 600, or leave it empty." };
      const n = parseInt(v, 10);
      return { text: String(n), body: { prepTimeMinutes: n } };
    }
    case "minimumDeliveryAmount":
    case "deliveryFee":
    case "processingFee": {
      const cents = toCents(v);
      if (cents === null) return { text: "", body: { [key]: null } };
      if (Number.isNaN(cents)) return { error: AMOUNT_RULE };
      return { text: centsText(cents), body: { [key]: centsToAmount(cents) } };
    }
    case "taxRatePercent": {
      if (!v) return { text: String(DEFAULT_TAX), body: { taxRatePercent: DEFAULT_TAX } };
      if (!/^\d+(\.\d{0,2})?$/.test(v) || parseFloat(v) > 100) return { error: "Enter a rate from 0 to 100, like 6 or 8.5." };
      const n = parseFloat(v);
      return { text: String(n), body: { taxRatePercent: n } };
    }
    default:
      return { text: v, body: { [key]: v } };
  }
}

/**
 * A receipt link safe to put in href/src: an /uploads/ path or an http(s) URL. Anything
 * else (javascript:, data:, junk) is treated as no receipt, because customers supply it.
 */
export function safeReceiptUrl(url: string | null | undefined): string | null {
  const v = url?.trim();
  if (!v) return null;
  if (/^\/uploads\/\S+$/.test(v)) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? v : null;
  } catch {
    return null;
  }
}
