import { api } from '@/lib/api';
import { DailySummary, DashboardSummary } from '@/types/pos';

export const posReportsService = {
  getDaily: (date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return api.get<DailySummary>(`/pos/reports/daily${qs}`);
  },

  getDashboard: () => api.get<DashboardSummary>('/pos/reports/dashboard'),
};
