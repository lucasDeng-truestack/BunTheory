import { api } from '@/lib/api';
import {
  PosOrder,
  PosOrderCreated,
  PosOrderLineType,
  PosOrderStatus,
  PosPaymentStatus,
  ReportRange,
} from '@/types/pos';

export interface CreateOrderPayload {
  customerName: string;
  serviceType: 'EAT_HERE' | 'TAKEAWAY';
  paymentMethod: 'CASH' | 'QR';
  tipAmount?: number;
  discountPercent?: 0 | 5 | 10;
  notes?: string;
  items: Array<{
    lineType: PosOrderLineType;
    productId: string;
    variantId?: string;
    quantity: number;
    remarks?: string;
    comboSelections?: Array<{ slotId: string; optionId: string }>;
  }>;
}

export const posOrdersService = {
  create: (payload: CreateOrderPayload) =>
    api.post<PosOrderCreated>('/pos/orders', payload),

  list: (filters?: { status?: PosOrderStatus; date?: string; range?: ReportRange }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.date) params.set('date', filters.date);
    if (filters?.range) params.set('range', filters.range);
    const qs = params.toString();
    return api.get<PosOrder[]>(`/pos/orders${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => api.get<PosOrder>(`/pos/orders/${id}`),

  advance: (id: string) => api.patch<PosOrder>(`/pos/orders/${id}/advance`),

  cancel: (id: string) => api.patch<PosOrder>(`/pos/orders/${id}/cancel`),

  updatePayment: (id: string, paymentStatus: PosPaymentStatus) =>
    api.patch<PosOrder>(`/pos/orders/${id}/payment`, { paymentStatus }),
};
