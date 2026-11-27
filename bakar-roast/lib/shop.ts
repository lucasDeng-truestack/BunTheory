// Helpers for the /order flow: money, time-slot labels, the cart (localStorage), an
// idempotency key, and the "remember my order link" recovery path. Pure and client-safe.
import type { ShopPackagePublic } from "./shop-api";

/** "88.00" -> "RM 88.00". */
export const formatRm = (decimal: string): string => `RM ${decimal}`;

/** Sum a decimal-string price times quantity, returned as a 2dp decimal string. */
export function lineTotal(price: string, quantity: number): string {
  return (Math.round(parseFloat(price) * quantity * 100) / 100).toFixed(2);
}

export function cartTotal(
  items: CartItem[],
  priceOf: (key: string) => string | undefined,
): string {
  const sum = items.reduce((acc, it) => {
    const p = priceOf(it.packageKey);
    return acc + (p ? parseFloat(p) * it.quantity : 0);
  }, 0);
  return (Math.round(sum * 100) / 100).toFixed(2);
}

/** Half the total, 2dp, rounded like the backend (half up). */
export function depositOf(total: string): string {
  return (Math.ceil(parseFloat(total) * 50) / 100).toFixed(2);
}

/** "15:00" -> "3pm", "12:30" -> "12:30pm". */
export function timeLabel(hhmm: string): string {
  const h = parseInt(hhmm.slice(0, 2), 10);
  const m = hhmm.slice(3, 5);
  const period = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m && m !== "00" ? `:${m}` : ""}${period}`;
}

/** "12:00-13:00" -> "12pm – 1pm", "12:30-13:30" -> "12:30pm – 1:30pm". */
export function slotLabel(slot: string): string {
  const [start, end] = slot.split("-");
  return start && end ? `${timeLabel(start)} – ${timeLabel(end)}` : slot;
}

/** "2026-12-14" -> "Sun, 14 Dec" (Malaysia-local, no timezone math needed on a date-only string). */
export function formatDateLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// ─── Cart (localStorage) ─────────────────────────────────────────────────────

export type CartItem = { packageKey: string; quantity: number };

/** The whole in-progress order, persisted so a refresh before checkout loses nothing. */
export type OrderDraft = {
  type: "DELIVERY" | "PICKUP";
  addr: { line1: string; line2: string; city: string; state: string; postcode: string };
  deliveryNotes: string;
  cart: CartItem[];
  date: string;
  slot: string;
  contact: { name: string; phone: string; email: string };
  paymentChoice: "DEPOSIT" | "FULL";
  /** Delivery or pickup has been picked (the opening question is answered). */
  methodChosen?: boolean;
  /** The step the customer was on, so a refresh returns there. */
  step?: string;
};

const DRAFT_KEY = "br-order-draft-v1";
const IDEMP_KEY = "br-order-idem-v1";
const LAST_ORDER_KEY = "br-last-order-v1";
const CUSTOMER_KEY = "br-customer-v1";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / blocked storage: the server copy is the real one anyway */
  }
}
function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadDraft(): Partial<OrderDraft> | null {
  const raw = safeGet(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Partial<OrderDraft>) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: OrderDraft) {
  safeSet(DRAFT_KEY, JSON.stringify(draft));
}

/** A stable key for this draft so a double-tap or retry returns the same order. */
export function cartIdempotencyKey(): string {
  let key = safeGet(IDEMP_KEY);
  if (!key) {
    key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `k_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    safeSet(IDEMP_KEY, key);
  }
  return key;
}

/** Called after an order is created: clear the draft and its idempotency key, remember the link. */
export function clearDraftAfterOrder(accessToken: string) {
  safeRemove(DRAFT_KEY);
  safeRemove(IDEMP_KEY);
  safeSet(LAST_ORDER_KEY, accessToken);
}

export function lastOrderToken(): string | null {
  return safeGet(LAST_ORDER_KEY);
}

export function orderPath(accessToken: string): string {
  return `/order/${encodeURIComponent(accessToken)}`;
}

/** Packages keyed for quick lookup by the cart. */
export const packageMap = (packages: ShopPackagePublic[]) =>
  new Map(packages.map((p) => [p.key, p]));

// ─── Remembered customer details (this device only) ──────────────────────────

/** Name, phone, email and delivery address kept on this device for the next order. */
export type SavedCustomer = {
  contact: OrderDraft["contact"];
  addr: OrderDraft["addr"];
};

export function loadSavedCustomer(): Partial<SavedCustomer> | null {
  const raw = safeGet(CUSTOMER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Partial<SavedCustomer>) : null;
  } catch {
    return null;
  }
}

export function saveCustomer(customer: SavedCustomer) {
  safeSet(CUSTOMER_KEY, JSON.stringify(customer));
}

export function forgetCustomer() {
  safeRemove(CUSTOMER_KEY);
}
