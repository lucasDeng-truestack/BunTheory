import { api } from "@/lib/api";
import type { CanOrderResponse } from "@/services/orders.service";

export type OrderBatchStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface OrderBatchListItem {
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
  menuSnapshot: { id: string; createdAt: string } | null;
  _count: { orders: number };
}

export interface CreateBatchPayload {
  label?: string;
  fulfillmentDate: string;
  opensAt: string;
  closesAt: string;
  maxItems: number;
}

export async function listBatches(token: string): Promise<OrderBatchListItem[]> {
  return api<OrderBatchListItem[]>("/batches", { token });
}

export async function getBatch(id: string, token: string) {
  return api<OrderBatchListItem & { menuSnapshot: unknown }>(`/batches/${id}`, {
    token,
  });
}

export async function createBatch(payload: CreateBatchPayload, token: string) {
  return api("/batches", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function publishBatch(id: string, token: string) {
  return api(`/batches/${id}/publish`, { method: "POST", token });
}

export async function closeBatch(id: string, token: string) {
  return api(`/batches/${id}/close`, { method: "POST", token });
}

/** Public: same shape as GET /orders/can-order */
export async function getActiveBatchPublic(): Promise<CanOrderResponse> {
  return api<CanOrderResponse>("/batches/active");
}
