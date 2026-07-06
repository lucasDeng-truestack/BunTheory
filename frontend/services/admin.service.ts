import { api } from "@/lib/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export type AdminRole = "OWNER" | "MANAGER" | "KITCHEN" | "CASHIER";

export interface LoginResponse {
  accessToken: string;
  admin: {
    id: string;
    email: string;
    displayName?: string | null;
    role?: AdminRole;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role?: AdminRole;
  createdAt: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminUsers(token: string): Promise<AdminUser[]> {
  return api<AdminUser[]>("/auth/admins", { token });
}

export async function createAdminUser(
  payload: LoginPayload & { displayName?: string },
  token: string
): Promise<AdminUser> {
  return api<AdminUser>("/auth/admins", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateAdminPassword(
  adminId: string,
  payload: { password: string; confirmPassword: string },
  token: string
): Promise<AdminUser> {
  return api<AdminUser>(`/auth/admins/${adminId}/password`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export interface SystemSettings {
  maxOrdersPerDay: number;
  orderingEnabled: boolean;
  minimumDeliveryAmount?: number | null;
  /** Admin display; null = use default full brand name (see `BRAND_FULL_NAME`). */
  companyName?: string | null;
  /** From POST /uploads/image; null = default logo asset. */
  companyLogoUrl?: string | null;
  /** Payment transfer QR at checkout; from POST /uploads/image. */
  paymentQrUrl?: string | null;
  /** E.164 e.g. +60123456789 — new-order WhatsApp to admin (not exposed on public /settings). */
  adminWhatsappNumber?: string | null;
  // Single-outlet config.
  outletName?: string | null;
  outletAddress?: string | null;
  outletHours?: Record<string, unknown> | null;
  prepTimeMinutes?: number | null;
  deliveryFee?: number | null;
  processingFee?: number | null;
  taxRatePercent?: number | null;
  deliveryRadiusNote?: string | null;
}

export interface UpdateOutletPayload {
  outletName?: string;
  outletAddress?: string;
  prepTimeMinutes?: number | null;
  deliveryFee?: number | null;
  processingFee?: number | null;
  taxRatePercent?: number;
  deliveryRadiusNote?: string;
}

export async function updateOutlet(
  payload: UpdateOutletPayload,
  token: string
) {
  return api<SystemSettings>("/settings/outlet", {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}

export async function getSettings(token: string): Promise<SystemSettings> {
  return api<SystemSettings>("/settings/admin", { token });
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

export async function updateBranding(
  payload: {
    companyName?: string;
    companyLogoUrl?: string;
    paymentQrUrl?: string;
    adminWhatsappNumber?: string;
  },
  token: string
) {
  return api<SystemSettings>("/settings/branding", {
    method: "PATCH",
    body: JSON.stringify(payload),
    token,
  });
}
