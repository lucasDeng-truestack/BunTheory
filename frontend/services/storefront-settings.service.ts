import { api } from "@/lib/api";

/** Public GET /settings — no auth (used at checkout for payment QR, etc.). */
export type PublicSystemSettings = {
  maxOrdersPerDay: number;
  orderingEnabled: boolean;
  minimumDeliveryAmount?: number | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  paymentQrUrl?: string | null;
};

export async function getPublicSettings(): Promise<PublicSystemSettings> {
  return api<PublicSystemSettings>("/settings");
}
