import { api } from "@/lib/api";

export type OrderBatchStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface OrderBatchRow {
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

export interface CreateBatchPayload {
  label?: string;
  fulfillmentDate: string;
  opensAt: string;
  closesAt: string;
  maxItems: number;
}

export interface UpdateBatchPayload {
  label?: string;
  fulfillmentDate?: string;
  opensAt?: string;
  closesAt?: string;
  maxItems?: number;
}

export async function fetchBatches(token: string): Promise<OrderBatchRow[]> {
  return api<OrderBatchRow[]>("/batches", { token });
}

export async function createBatch(
  payload: CreateBatchPayload,
  token: string
): Promise<OrderBatchRow> {
  return api<OrderBatchRow>("/batches", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateBatch(
  id: string,
  payload: UpdateBatchPayload,
  token: string
): Promise<OrderBatchRow> {
  return api<OrderBatchRow>(`/batches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function publishBatch(id: string, token: string): Promise<OrderBatchRow> {
  return api<OrderBatchRow>(`/batches/${id}/publish`, {
    method: "POST",
    token,
  });
}

export async function closeBatch(id: string, token: string): Promise<OrderBatchRow> {
  return api<OrderBatchRow>(`/batches/${id}/close`, {
    method: "POST",
    token,
  });
}

export async function reopenBatch(id: string, token: string): Promise<OrderBatchRow> {
  return api<OrderBatchRow>(`/batches/${id}/reopen`, {
    method: "POST",
    token,
  });
}

export async function deleteBatch(id: string, token: string): Promise<void> {
  await api(`/batches/${id}`, { method: "DELETE", token });
}
