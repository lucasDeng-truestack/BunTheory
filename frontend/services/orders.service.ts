import { api } from "@/lib/api";
import type { Order, OrderStatus } from "@/types/order";

export interface OrderItemSelectionPayload {
  groupId: string;
  optionIds: string[];
}

export interface CreateOrderPayload {
  customerName: string;
  phone: string;
  type: "PICKUP" | "DELIVERY";
  paymentChoice?: "PAY_LATER" | "PAY_NOW";
  /** When PAY_NOW: proof URL from POST /uploads/payment-receipt; omit if sending proof via WhatsApp. */
  receiptUrl?: string;
  items: {
    slug?: string;
    menuId?: string;
    quantity: number;
    remarks?: string;
    selections?: OrderItemSelectionPayload[];
  }[];
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return api<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrder(
  id: string,
  token?: string
): Promise<Order> {
  return api<Order>(`/orders/${id}`, token ? { token } : undefined);
}

export type StorefrontReason = "OK" | "DISABLED" | "FULL" | "NO_BATCH";

export interface ActiveBatchInfo {
  id: string;
  label: string | null;
  opensAt: string;
  closesAt: string;
  fulfillmentDate: string;
}

export interface CanOrderResponse {
  canOrder: boolean;
  reason: StorefrontReason;
  current: number;
  max: number;
  minimumDeliveryAmount: number | null;
  /** Present when a published batch is currently open (ordering may still be blocked if full). */
  activeBatch?: ActiveBatchInfo | null;
}

export interface GetOrdersParams {
  date?: "today" | "week" | "month" | "all";
  customer?: string;
  menuId?: string;
  batchId?: string;
  /** Only orders with Pay now + receipt (admin list filter). */
  paymentOnly?: boolean;
}

/** Admin: count of orders not yet delivered (sidebar badge). */
export async function getPendingOrdersCount(token: string): Promise<number> {
  const { count } = await api<{ count: number }>("/orders/pending-count", {
    token,
  });
  return count;
}

export async function getOrders(
  token: string,
  params?: GetOrdersParams
): Promise<Order[]> {
  const search = new URLSearchParams();
  if (params?.date) search.set("date", params.date);
  if (params?.customer?.trim()) search.set("customer", params.customer.trim());
  if (params?.menuId?.trim()) search.set("menuId", params.menuId.trim());
  if (params?.batchId?.trim()) search.set("batchId", params.batchId.trim());
  if (params?.paymentOnly) search.set("paymentOnly", "true");
  const qs = search.toString();
  return api<Order[]>(`/orders${qs ? `?${qs}` : ""}`, { token });
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  token: string
): Promise<Order> {
  return api<Order>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    token,
  });
}

export async function getCanOrder(): Promise<CanOrderResponse> {
  return api<CanOrderResponse>("/orders/can-order");
}

export async function getTodayOrderCount(): Promise<number> {
  return api<number>("/orders/today-count");
}

/** Public: active orders for this phone (no DELIVERED; last 7 days on server). */
export async function trackOrdersByPhone(phone: string): Promise<Order[]> {
  const search = new URLSearchParams();
  search.set("phone", phone);
  return api<Order[]>(`/orders/track?${search.toString()}`);
}

