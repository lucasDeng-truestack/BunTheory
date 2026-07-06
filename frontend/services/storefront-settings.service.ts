import { api } from "@/lib/api";

/** Public GET /settings — no auth (used at checkout for payment QR, etc.). */
export type PublicSystemSettings = {
  maxOrdersPerDay: number;
  orderingEnabled: boolean;
  minimumDeliveryAmount?: number | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  paymentQrUrl?: string | null;
  // Single-outlet config (fulfillment header + checkout).
  outletName?: string | null;
  outletAddress?: string | null;
  outletHours?: Record<string, unknown> | null;
  prepTimeMinutes?: number | null;
  deliveryFee?: number | null;
  processingFee?: number | null;
  taxRatePercent?: number | null;
  deliveryRadiusNote?: string | null;
};

export async function getPublicSettings(revalidate?: number): Promise<PublicSystemSettings> {
  return api<PublicSystemSettings>(
    "/settings",
    revalidate != null ? { next: { revalidate } } : undefined
  );
}
