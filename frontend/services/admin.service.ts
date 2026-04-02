import { api } from "@/lib/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  admin: { id: string; email: string };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface SystemSettings {
  maxOrdersPerDay: number;
  orderingEnabled: boolean;
  minimumDeliveryAmount?: number | null;
}

export async function getSettings(token: string): Promise<SystemSettings> {
  return api<SystemSettings>("/settings", { token });
}

export async function updateMaxOrders(
  maxOrdersPerDay: number,
  token: string
) {
  return api("/settings/max-orders", {
    method: "PATCH",
    body: JSON.stringify({ maxOrdersPerDay }),
    token,
  });
}

export async function toggleOrdering(
  orderingEnabled: boolean,
  token: string
) {
  return api("/settings/toggle-ordering", {
    method: "PATCH",
    body: JSON.stringify({ orderingEnabled }),
    token,
  });
}

export async function updateMinimumDelivery(
  minimumDeliveryAmount: number | null,
  token: string
) {
  return api("/settings/minimum-delivery", {
    method: "PATCH",
    body: JSON.stringify({ minimumDeliveryAmount }),
    token,
  });
}
