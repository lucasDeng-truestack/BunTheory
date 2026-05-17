import { api } from '@/lib/api';
import {
  PosOrder,
  PosOrderCreated,
  PosOrderStatus,
  PosPaymentStatus,
} from '@/types/pos';

export interface CreateOrderPayload {
  customerName: string;
  serviceType: 'EAT_HERE' | 'TAKEAWAY';
  paymentMethod: 'CASH' | 'QR';
  /** Tip in RM — embedded in receipt token only; not stored separately in DB totals. */
  tipAmount?: number;
  notes?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    remarks?: string;
  }>;
}

export const posOrdersService = {
  create: (payload: CreateOrderPayload) =>
    api.post<PosOrderCreated>('/pos/orders', payload),

  list: (filters?: { status?: PosOrderStatus; date?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.date) params.set('date', filters.date);
    const qs = params.toString();
    return api.get<PosOrder[]>(`/pos/orders${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => api.get<PosOrder>(`/pos/orders/${id}`),

  advance: (id: string) => api.patch<PosOrder>(`/pos/orders/${id}/advance`),

  cancel: (id: string) => api.patch<PosOrder>(`/pos/orders/${id}/cancel`),

  updatePayment: (id: string, paymentStatus: PosPaymentStatus) =>
    api.patch<PosOrder>(`/pos/orders/${id}/payment`, { paymentStatus }),
};
