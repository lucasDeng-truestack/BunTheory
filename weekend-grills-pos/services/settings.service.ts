import { api } from '@/lib/api';

export interface PosSettings {
  companyName: string | null;
  companyLogoUrl: string | null;
  paymentQrUrl: string | null;
  adminWhatsappNumber: string | null;
  maxOrdersPerDay: number;
  orderingEnabled: boolean;
  minimumDeliveryAmount: number | null;
}

export const posSettingsService = {
  getSettings: () => api.get<PosSettings>('/settings/admin'),

  updateBranding: (data: {
    companyName?: string;
    companyLogoUrl?: string;
    paymentQrUrl?: string;
    adminWhatsappNumber?: string;
  }) => api.patch<PosSettings>('/settings/branding', data),
};
