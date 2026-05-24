import { api } from '@/lib/api';
import { PosPurchase } from '@/types/pos';

export const posPurchasesService = {
  list: (filters?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const qs = params.toString();
    return api.get<PosPurchase[]>(`/pos/purchases${qs ? `?${qs}` : ''}`);
  },

  create: (data: { remark: string; amount: number; purchasedAt?: string }) =>
    api.post<PosPurchase>('/pos/purchases', data),

  delete: (id: string) => api.delete<void>(`/pos/purchases/${id}`),
};
