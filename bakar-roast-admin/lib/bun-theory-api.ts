// Every backend call the Bun Theory admin screens make. Screens import from here, never call fetch.
// Mirrors frontend/types and frontend/services (the old Bun Theory admin), with the token first
// like lib/catering-api.ts. Staff management lives here too: it is shared by the whole admin.
import { api } from "./api";
import type { AdminUser } from "./catering-api";

const json = (method: string, body?: unknown, token?: string): RequestInit & { token?: string } => ({
  method,
  token,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderType = "PICKUP" | "DELIVERY";
export type OrderStatus =
  | "RECEIVED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "PICKED_UP"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";
export type PaymentChoice = "PAY_LATER" | "PAY_NOW";

/** Money fields arrive as Prisma Decimal strings or numbers; read them with toAmount below. */
type Money = number | string | null | undefined;

export interface OrderItem {
  id: string;
  menuId?: string;
  quantity: number;
  remarks?: string | null;
  unitPrice?: Money;
  selectedOptions?: unknown;
  menu?: { name: string; price?: Money };
}

export interface Order {
  id: string;
  slugId?: string;
  customerName: string;
  phone: string;
  type: OrderType;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  status: OrderStatus;
  cancelledAt?: string | null;
  createdAt: string;
  restaurantComment?: string | null;
  /** Null on legacy orders; fall back to the line-item sum. */
  subtotal?: Money;
  deliveryFee?: Money;
  processingFee?: Money;
  /** Tax already included in total. */
  taxAmount?: Money;
  total?: Money;
  paymentChoice?: PaymentChoice;
  paymentReceiptUrl?: string | null;
  orderItems: OrderItem[];
  batchId?: string | null;
  batch?: {
    id: string;
    label: string | null;
    fulfillmentDate?: string;
    opensAt: string;
    closesAt: string;
  } | null;
}

export interface OrdersQuery {
  date?: "today" | "week" | "month" | "all";
  customer?: string;
  menuId?: string;
  batchId?: string;
  /** Only Pay now orders with a receipt (the receipts screen). */
  paymentOnly?: boolean;
}

export const toAmount = (v: Money): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
};

export function listOrders(token: string, q: OrdersQuery = {}) {
  const s = new URLSearchParams();
  if (q.date) s.set("date", q.date);
  if (q.customer?.trim()) s.set("customer", q.customer.trim());
  if (q.menuId?.trim()) s.set("menuId", q.menuId.trim());
  if (q.batchId?.trim()) s.set("batchId", q.batchId.trim());
  if (q.paymentOnly) s.set("paymentOnly", "true");
  const qs = s.toString();
  return api<Order[]>(`/orders${qs ? `?${qs}` : ""}`, { token });
}

export const getOrder = (token: string, id: string) =>
  api<Order>(`/orders/${encodeURIComponent(id)}`, { token });

export const updateOrderStatus = (token: string, id: string, status: OrderStatus) =>
  api<Order>(`/orders/${encodeURIComponent(id)}/status`, json("PATCH", { status }, token));

/** Orders not yet delivered: the Bun Theory badge in the admin menu. */
export const ordersPendingCount = (token: string) =>
  api<{ count: number }>("/orders/pending-count", { token });

export const todayOrderCount = () => api<number>("/orders/today-count");

export type StorefrontReason = "OK" | "FULL" | "DISABLED" | "NO_BATCH";

export interface ActiveBatchInfo {
  id: string;
  label: string | null;
  opensAt: string;
  closesAt: string;
  fulfillmentDate: string;
}

/** Whether the storefront takes orders now, and the open batch's load (frontend CanOrderResponse). */
export interface CanOrderResponse {
  canOrder: boolean;
  reason: StorefrontReason;
  /** Items taken in the open batch; 0 when ordering is off or no batch is open. */
  current: number;
  max: number;
  minimumDeliveryAmount: number | null;
  activeBatch?: ActiveBatchInfo | null;
}

/** Public: the storefront's ordering state (the overview's kitchen load). */
export const canOrder = () => api<CanOrderResponse>("/orders/can-order");

// ─── Batches ─────────────────────────────────────────────────────────────────

export type OrderBatchStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface OrderBatch {
  id: string;
  label: string | null;
  fulfillmentDate: string;
  opensAt: string;
  closesAt: string;
  maxItems: number;
  status: OrderBatchStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
}

export interface BatchInput {
  label?: string;
  fulfillmentDate: string;
  opensAt: string;
  closesAt: string;
  maxItems: number;
}

export const listBatches = (token: string) => api<OrderBatch[]>("/batches", { token });

export const createBatch = (token: string, input: BatchInput) =>
  api<OrderBatch>("/batches", json("POST", input, token));

export const updateBatch = (token: string, id: string, input: Partial<BatchInput>) =>
  api<OrderBatch>(`/batches/${id}`, json("PATCH", input, token));

export const publishBatch = (token: string, id: string) =>
  api<OrderBatch>(`/batches/${id}/publish`, json("POST", undefined, token));

export const closeBatch = (token: string, id: string) =>
  api<OrderBatch>(`/batches/${id}/close`, json("POST", undefined, token));

export const reopenBatch = (token: string, id: string) =>
  api<OrderBatch>(`/batches/${id}/reopen`, json("POST", undefined, token));

export const deleteBatch = (token: string, id: string) =>
  api<unknown>(`/batches/${id}`, json("DELETE", undefined, token));

// ─── Menu ────────────────────────────────────────────────────────────────────

export interface MenuOption {
  id: string;
  label: string;
  priceDelta: number;
  sortOrder: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  sortOrder: number;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isFavorite: boolean;
  available: boolean;
  /** Storefront grouping such as "Buns" or "Sides"; null = uncategorised. */
  category: string | null;
  maxQuantity: number | null;
  sortOrder: number;
  createdAt: string;
  soldOut: boolean;
  soldQuantity: number;
  optionGroups: MenuOptionGroup[];
}

/** Same as frontend/lib/menu-slug.ts normalizeMenuSlug. */
const normalizeSlug = (slug: string) => slug.trim().toLowerCase();

/** Prices arrive as Decimal strings; the screens work in numbers. */
function normalizeMenuItem(i: MenuItem): MenuItem {
  return {
    ...i,
    slug: normalizeSlug(i.slug),
    price: toAmount(i.price),
    soldOut: i.soldOut ?? false,
    soldQuantity: i.soldQuantity ?? 0,
    maxQuantity: i.maxQuantity ?? null,
    sortOrder: i.sortOrder ?? 0,
    optionGroups: (i.optionGroups ?? []).map((g) => ({
      ...g,
      options: (g.options ?? []).map((o) => ({ ...o, priceDelta: toAmount(o.priceDelta) })),
    })),
  };
}

/** The admin's live menu, including unavailable items unless availableOnly. */
export const listMenu = (token: string, availableOnly = false) =>
  api<MenuItem[]>(`/menu/draft${availableOnly ? "?available=true" : ""}`, { token }).then((items) =>
    items.map(normalizeMenuItem),
  );

/**
 * The create and update body (backend/src/modules/menu/dto). On update every key is optional,
 * undefined means "no change", and optionGroups replaces every group. A type (not an interface)
 * so it passes as Record<string, unknown>.
 */
export type MenuItemInput = {
  name: string;
  description?: string;
  price: number;
  image?: string;
  isFavorite: boolean;
  available: boolean;
  /** Null clears it (update only). */
  category: string | null;
  soldOut: boolean;
  /** Null clears the cap (update only); left out on create means no cap. */
  maxQuantity?: number | null;
  optionGroups: {
    name: string;
    required: boolean;
    multiSelect: boolean;
    options: { label: string; priceDelta: number }[];
  }[];
};

/** Body is the menu DTO (backend/src/modules/menu/dto); the menu screen builds it as MenuItemInput. */
export const createMenuItem = (token: string, body: Record<string, unknown>) =>
  api<MenuItem>("/menu", json("POST", body, token)).then(normalizeMenuItem);

export const updateMenuItem = (token: string, id: string, body: Record<string, unknown>) =>
  api<MenuItem>(`/menu/${id}`, json("PATCH", body, token)).then(normalizeMenuItem);

export const deleteMenuItem = (token: string, id: string) =>
  api<unknown>(`/menu/${id}`, json("DELETE", undefined, token));

// ─── Feedback ────────────────────────────────────────────────────────────────

export interface AppFeedback {
  id: string;
  message: string;
  orderId: string | null;
  createdAt: string;
  order: { slugId: string; customerName: string } | null;
}

export const listFeedback = (token: string) => api<AppFeedback[]>("/feedback", { token });

// ─── Bun Theory settings ─────────────────────────────────────────────────────
// Same GET /settings/admin row the catering settings read; these are its Bun Theory fields.

export interface BunTheorySettings {
  maxOrdersPerDay: number;
  orderingEnabled: boolean;
  minimumDeliveryAmount?: number | null;
  /** Checkout transfer QR, from POST /uploads/image. */
  paymentQrUrl?: string | null;
  outletName?: string | null;
  outletAddress?: string | null;
  outletHours?: Record<string, unknown> | null;
  prepTimeMinutes?: number | null;
  deliveryFee?: number | null;
  processingFee?: number | null;
  taxRatePercent?: number | null;
  deliveryRadiusNote?: string | null;
}

export interface OutletInput {
  outletName?: string;
  outletAddress?: string;
  prepTimeMinutes?: number | null;
  deliveryFee?: number | null;
  processingFee?: number | null;
  taxRatePercent?: number;
  deliveryRadiusNote?: string;
}

type RawSettings = Omit<BunTheorySettings, "minimumDeliveryAmount" | "deliveryFee" | "processingFee" | "taxRatePercent"> & {
  minimumDeliveryAmount?: Money;
  deliveryFee?: Money;
  processingFee?: Money;
  taxRatePercent?: Money;
};

const amountOrNull = (v: Money) => (v === null || v === undefined || v === "" ? null : toAmount(v));

/**
 * GET /settings/admin and every settings PATCH return the raw settings row, where the Decimal
 * columns (minimum delivery, fees, tax) arrive as strings. Read them as numbers here.
 */
function normalizeSettings(s: RawSettings): BunTheorySettings {
  return {
    ...s,
    minimumDeliveryAmount: amountOrNull(s.minimumDeliveryAmount),
    deliveryFee: amountOrNull(s.deliveryFee),
    processingFee: amountOrNull(s.processingFee),
    taxRatePercent: amountOrNull(s.taxRatePercent),
  };
}

export const getBunTheorySettings = (token: string) =>
  api<RawSettings>("/settings/admin", { token }).then(normalizeSettings);

export const updateMaxOrders = (token: string, maxOrdersPerDay: number) =>
  api<RawSettings>("/settings/max-orders", json("PATCH", { maxOrdersPerDay }, token)).then(normalizeSettings);

export const setOrderingEnabled = (token: string, orderingEnabled: boolean) =>
  api<RawSettings>("/settings/toggle-ordering", json("PATCH", { orderingEnabled }, token)).then(normalizeSettings);

export const updateMinimumDelivery = (token: string, minimumDeliveryAmount: number | null) =>
  api<RawSettings>("/settings/minimum-delivery", json("PATCH", { minimumDeliveryAmount }, token)).then(normalizeSettings);

/** Keys left out are not changed (the server only writes the keys it is sent). */
export const updateOutlet = (token: string, input: OutletInput) =>
  api<RawSettings>("/settings/outlet", json("PATCH", input, token)).then(normalizeSettings);

/** Only the payment QR is edited here; company name and logo are no longer used. Empty string removes it. */
export const updatePaymentQr = (token: string, paymentQrUrl: string) =>
  api<RawSettings>("/settings/branding", json("PATCH", { paymentQrUrl }, token)).then(normalizeSettings);

// ─── Team (staff accounts, shared by the whole admin) ────────────────────────

export interface TeamMember extends AdminUser {
  createdAt: string;
}

export const listTeam = (token: string) => api<TeamMember[]>("/auth/admins", { token });

/** What create, rename and password changes return: the member without their role (the server leaves it out). */
export type TeamMemberSaved = Omit<TeamMember, "role">;

export const createTeamMember = (
  token: string,
  input: { email: string; password: string; displayName?: string },
) => api<TeamMemberSaved>("/auth/admins", json("POST", input, token));

export const updateTeamMemberName = (token: string, id: string, displayName: string) =>
  api<TeamMemberSaved>(`/auth/admins/${id}/display-name`, json("PATCH", { displayName }, token));

export const updateTeamMemberPassword = (
  token: string,
  id: string,
  input: { password: string; confirmPassword: string },
) => api<TeamMemberSaved>(`/auth/admins/${id}/password`, json("PATCH", input, token));
