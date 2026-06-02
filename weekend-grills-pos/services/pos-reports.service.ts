import { api } from '@/lib/api';
import {
  CustomerOrdersResponse,
  CustomerReportSummary,
  DailySummary,
  DashboardSummary,
  ReportRange,
} from '@/types/pos';

export const posReportsService = {
  getDaily: (date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return api.get<DailySummary>(`/pos/reports/daily${qs}`);
  },

  getSummary: (range: ReportRange = 'today') =>
    api.get<DailySummary>(`/pos/reports/summary?range=${range}`),

  getDashboard: () => api.get<DashboardSummary>('/pos/reports/dashboard'),

  getCustomers: (range: ReportRange = 'today') =>
    api.get<CustomerReportSummary[]>(`/pos/reports/customers?range=${range}`),

  getCustomerOrders: (customerName: string, range: ReportRange = 'today') =>
    api.get<CustomerOrdersResponse>(
      `/pos/reports/customer-orders?range=${range}&customerName=${encodeURIComponent(customerName)}`,
    ),
};
