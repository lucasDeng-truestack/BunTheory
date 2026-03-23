import { api } from "@/lib/api";
import type { Order, OrderStatus } from "@/types/order";

export interface CreateOrderPayload {
  customerName: string;
  phone: string;
  type: "PICKUP" | "DELIVERY";
  items: { slug?: string; menuId?: string; quantity: number }[];
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return api<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrder(id: string): Promise<Order> {
  return api<Order>(`/orders/${id}`);
}

export interface GetOrdersParams {
  date?: "today" | "week" | "month" | "all";
  customer?: string;
  menuId?: string;
}

export async function getOrders(
  token: string,
  params?: GetOrdersParams
): Promise<Order[]> {
  const search = new URLSearchParams();
  if (params?.date) search.set("date", params.date);
  if (params?.customer?.trim()) search.set("customer", params.customer.trim());
  if (params?.menuId?.trim()) search.set("menuId", params.menuId.trim());
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

export interface CanOrderResponse {
  canOrder: boolean;
  current: number;
  max: number;
}

export async function getCanOrder(): Promise<CanOrderResponse> {
  return api<CanOrderResponse>("/orders/can-order");
}

export async function getTodayOrderCount(): Promise<number> {
  return api<number>("/orders/today-count");
}
