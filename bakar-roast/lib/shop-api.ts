// Every backend call the Bakar & Roast /order flow makes. Screens import from here, never fetch.
// Mirrors backend/src/modules/shop/shop.types.ts.
import { api } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3101";

export type ShopFulfilmentType = "PICKUP" | "DELIVERY";
export type ShopPaymentChoice = "DEPOSIT" | "FULL";
export type ShopOrderStatus = "AWAITING_PAYMENT" | "DEPOSIT_PAID" | "PAID" | "CANCELLED";

export interface ShopPackagePublic {
  key: string;
  name: string;
  tagline: string;
  description: string;
  includes: string[];
  /** Photos, cover first. Empty until the owner adds some. */
  images: string[];
  /** Decimal string, e.g. "88.00". */
  price: string;
}

export interface ShopConfigPublic {
  packages: ShopPackagePublic[];
  pickupArea: string;
  /** Inclusive YYYY-MM-DD bounds for the fulfilment date. */
  minDate: string;
  maxDate: string;
  /** Default serving window, on the hour. A day can override it (see availability). */
  defaultHours: { start: string; end: string };
  /** False while pre-orders have not opened; then `ordersOpenDate` is when they do. */
  ordersOpen: boolean;
  ordersOpenDate: string | null;
}

export interface ShopAvailabilityDay {
  date: string;
  /** "HH:00-HH:00" windows offered on this date. Never empty. */
  slots: string[];
}

/** Live open dates and their slots — the source of truth for the date/time picker. */
export interface ShopAvailability {
  minDate: string;
  maxDate: string;
  ordersOpen: boolean;
  ordersOpenDate: string | null;
  days: ShopAvailabilityDay[];
}

export interface ShopOrderItemView {
  packageKey: string;
  packageName: string;
  unitPrice: string;
  quantity: number;
}

export interface ShopReceiptView {
  id: string;
  fileUrl: string;
  fileName: string | null;
  createdAt: string;
}

export interface ShopOrderPublic {
  reference: string;
  accessToken: string;
  status: ShopOrderStatus;
  type: ShopFulfilmentType;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postcode: string;
    country: "Malaysia";
    notes: string | null;
  } | null;
  pickupArea: string | null;
  fulfilmentDate: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  items: ShopOrderItemView[];
  subtotal: string;
  total: string;
  paymentChoice: ShopPaymentChoice;
  amountDue: string;
  depositPaidAt: string | null;
  fullyPaidAt: string | null;
  receipts: ShopReceiptView[];
  createdAt: string;
}

export interface ShopOrderCreated {
  reference: string;
  accessToken: string;
}

export interface CreateShopOrderInput {
  type: ShopFulfilmentType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  deliveryNotes?: string;
  fulfilmentDate: string;
  timeSlot: string;
  items: { packageKey: string; quantity: number }[];
  paymentChoice: ShopPaymentChoice;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  /** The total shown to the customer, "279.00". The server refuses the order if it has changed. */
  expectedTotal?: string;
  idempotencyKey?: string;
}

export const getShopConfig = () =>
  // Never cached: the owner edits packages and prices, and the server charges the live price.
  api<ShopConfigPublic>("/shop/config", { cache: "no-store" });

/** Never cached: it must reflect owner schedule changes the moment they are made. */
export const getShopAvailability = () =>
  api<ShopAvailability>("/shop/availability", { cache: "no-store" });

/** `customerToken` (optional) saves the order to the signed-in customer's account. */
export const createShopOrder = (input: CreateShopOrderInput, customerToken?: string) =>
  api<ShopOrderCreated>("/shop/orders", {
    method: "POST",
    body: JSON.stringify(input),
    ...(customerToken ? { token: customerToken } : {}),
  });

// ─── Customer account ────────────────────────────────────────────────────────

/** One of a signed-in customer's orders. Opens at /order/<accessToken>. */
export interface ShopOrderMine {
  reference: string;
  accessToken: string;
  status: ShopOrderStatus;
  type: ShopFulfilmentType;
  fulfilmentDate: string;
  timeSlot: string;
  total: string;
  /** "2 × Family Feast, 1 × Smoke Box" */
  summary: string;
  receiptUploaded: boolean;
  createdAt: string;
}

export interface ShopMe {
  email: string;
  /** From the customer's own earlier orders. Null until they have placed one while signed in. */
  details: {
    name: string;
    phone: string;
    address: { line1: string; line2: string; city: string; state: string; postcode: string } | null;
  } | null;
  orders: ShopOrderMine[];
}

export const getShopMe = (customerToken: string) =>
  api<ShopMe>("/shop/me", { token: customerToken });

export const getShopOrder = (accessToken: string) =>
  api<ShopOrderPublic>(`/shop/orders/${encodeURIComponent(accessToken)}`);

// ─── Owner admin ─────────────────────────────────────────────────────────────

export interface ShopOrderAdmin extends ShopOrderPublic {
  id: string;
  adminNotes: string | null;
  updatedAt: string;
}

export type ShopPaymentStage = "DEPOSIT" | "FULL";

export const shopAdminListOrders = (token: string, status?: string) =>
  api<ShopOrderAdmin[]>(
    `/shop/admin/orders${status && status !== "ALL" ? `?status=${status}` : ""}`,
    { token },
  );

export const shopAdminGetOrder = (token: string, id: string) =>
  api<ShopOrderAdmin>(`/shop/admin/orders/${id}`, { token });

export const shopAdminMarkPayment = (token: string, id: string, stage: ShopPaymentStage) =>
  api<ShopOrderAdmin>(`/shop/admin/orders/${id}/payment`, {
    token,
    method: "POST",
    body: JSON.stringify({ stage }),
  });

export const shopAdminCancel = (token: string, id: string, reason?: string) =>
  api<ShopOrderAdmin>(`/shop/admin/orders/${id}/cancel`, {
    token,
    method: "POST",
    body: JSON.stringify({ reason }),
  });

// ─── Owner admin: schedule (availability) ────────────────────────────────────

export interface ShopScheduleDay {
  date: string;
  closed: boolean;
  /** Owner-only note (why a day is closed). */
  note: string | null;
  serveStart: string | null;
  serveEnd: string | null;
}

export interface ShopSchedule {
  earliestDate: string;
  ordersOpenDate: string | null;
  minNoticeDays: number;
  windowDays: number;
  defaultHours: { start: string; end: string };
  /** Length of one time slot, in minutes. */
  slotMinutes: number;
  minDate: string;
  maxDate: string;
  days: ShopScheduleDay[];
}

/** The availability rules the owner can change. Omitted fields stay as they are. */
export interface ShopSettingsInput {
  shopEarliestDate?: string;
  /** Empty string clears it (orders open now). */
  shopOrdersOpenDate?: string;
  shopMinNoticeDays?: number;
  shopWindowDays?: number;
  shopServeStart?: string;
  shopServeEnd?: string;
  /** 30, 60, 90 or 120. */
  shopSlotMinutes?: number;
}

export const shopAdminGetSchedule = (token: string) =>
  api<ShopSchedule>("/shop/admin/schedule", { token });

export const shopAdminUpdateSettings = (token: string, input: ShopSettingsInput) =>
  api<unknown>("/settings/shop", {
    token,
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const shopAdminCloseRange = (
  token: string,
  from: string,
  to: string,
  reason?: string,
) =>
  api<{ closed: number }>("/shop/admin/days/close", {
    token,
    method: "POST",
    body: JSON.stringify({ from, to, reason }),
  });

export const shopAdminOpenRange = (token: string, from: string, to: string) =>
  api<{ opened: number }>("/shop/admin/days/open", {
    token,
    method: "POST",
    body: JSON.stringify({ from, to }),
  });

export const shopAdminRangeHours = (
  token: string,
  from: string,
  to: string,
  start: string | null,
  end: string | null,
) =>
  api<{ updated: number }>("/shop/admin/days/hours", {
    token,
    method: "POST",
    body: JSON.stringify({ from, to, start, end }),
  });

export const shopAdminSetDay = (
  token: string,
  date: string,
  body: { closed?: boolean; serveStart?: string | null; serveEnd?: string | null; note?: string | null },
) =>
  api<ShopScheduleDay>(`/shop/admin/days/${date}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(body),
  });

// ─── Owner admin: packages (what /order sells) ───────────────────────────────

/** One package as the owner sees it, hidden ones included. */
export interface ShopPackageAdmin {
  id: string;
  name: string;
  tagline: string;
  description: string;
  includes: string[];
  /** Photo URLs, cover first. */
  images: string[];
  /** Decimal string, e.g. "88.00". */
  price: string;
  /** False hides it from the menu. */
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface ShopPackageInput {
  name: string;
  tagline: string;
  description: string;
  includes: string[];
  images: string[];
  price: string;
  active: boolean;
}

export const shopAdminListPackages = (token: string) =>
  api<ShopPackageAdmin[]>("/shop/admin/packages", { token });

export const shopAdminCreatePackage = (token: string, input: ShopPackageInput) =>
  api<ShopPackageAdmin>("/shop/admin/packages", {
    token,
    method: "POST",
    body: JSON.stringify(input),
  });

export const shopAdminUpdatePackage = (token: string, id: string, input: Partial<ShopPackageInput>) =>
  api<ShopPackageAdmin>(`/shop/admin/packages/${id}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const shopAdminDeletePackage = (token: string, id: string) =>
  api<{ deleted: true }>(`/shop/admin/packages/${id}`, { token, method: "DELETE" });

/** Every package id, in the order the menu should show them. */
export const shopAdminReorderPackages = (token: string, ids: string[]) =>
  api<ShopPackageAdmin[]>("/shop/admin/packages/reorder", {
    token,
    method: "POST",
    body: JSON.stringify({ ids }),
  });

export async function uploadShopReceipt(accessToken: string, file: File): Promise<ShopOrderPublic> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/shop/orders/${encodeURIComponent(accessToken)}/receipts`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message || "Could not upload the receipt.");
  }
  return res.json();
}
