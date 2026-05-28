'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { PosShell } from '@/components/layout/pos-shell';
import { DashboardAnalyticsKpis } from '@/components/dashboard/dashboard-analytics-kpis';
import { DashboardRevenueTrendChart } from '@/components/dashboard/dashboard-revenue-trend-chart';
import { DashboardOrderStatusChart } from '@/components/dashboard/dashboard-order-status-chart';
import { DashboardOrdersRevenueChart } from '@/components/dashboard/dashboard-orders-revenue-chart';
import { DashboardKitchenLoadPanel } from '@/components/dashboard/dashboard-kitchen-load-panel';
import { DashboardSalesBySectionTable } from '@/components/dashboard/dashboard-sales-by-section-table';
import { DashboardPipelineBars } from '@/components/dashboard/dashboard-pipeline-bars';
import { DashboardRecentOrders } from '@/components/dashboard/dashboard-recent-orders';
import { DashboardRevenueSplit } from '@/components/dashboard/dashboard-revenue-split';
import { DashboardTopItems } from '@/components/dashboard/dashboard-top-items';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { posReportsService } from '@/services/pos-reports.service';
import type { DashboardSummary } from '@/types/pos';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDashboard() {
    try {
      const d = await posReportsService.getDashboard();
      setData(d);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
    const id = setInterval(fetchDashboard, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <PosShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card px-5 py-3 flex items-center gap-3">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              The Weekend Grillers — Today&apos;s overview & 7-day trends
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => {
              setLoading(true);
              void fetchDashboard();
            }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {loading && !data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
              <Separator />
              <div className="h-64 rounded-xl bg-muted animate-pulse" />
            </div>
          ) : data ? (
            <>
              <DashboardAnalyticsKpis pipeline={data.pipeline} today={data.today} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <DashboardRevenueTrendChart data={data.revenueTrend} />
                </div>
                <DashboardOrderStatusChart breakdown={data.statusBreakdown} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <DashboardOrdersRevenueChart data={data.revenueTrend} />
                </div>
                <DashboardKitchenLoadPanel load={data.kitchenLoad} pipeline={data.pipeline} />
              </div>

              <DashboardSalesBySectionTable sections={data.salesBySection} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <DashboardPipelineBars pipeline={data.pipeline} />
                <DashboardRecentOrders orders={data.recentOrders} />
                <div className="space-y-4">
                  <DashboardRevenueSplit
                    cashRevenue={data.today.cashRevenue}
                    qrRevenue={data.today.qrRevenue}
                    totalRevenue={data.today.totalRevenue}
                  />
                  <DashboardTopItems items={data.topItems} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
              <p className="font-display font-semibold">Unable to load dashboard</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setLoading(true);
                  void fetchDashboard();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </PosShell>
  );
}
