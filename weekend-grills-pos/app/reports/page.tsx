'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, RefreshCw } from 'lucide-react';
import { PosShell } from '@/components/layout/pos-shell';
import { OrdersHistoryTable } from '@/components/reports/orders-history-table';
import { CustomerReportsTable } from '@/components/reports/customer-reports-table';
import { CustomerOrdersDialog } from '@/components/reports/customer-orders-dialog';
import { posReportsService } from '@/services/pos-reports.service';
import { posOrdersService } from '@/services/pos-orders.service';
import { CustomerReportSummary, DailySummary, PosOrder, ReportRange } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const RANGE_OPTIONS: Array<{ value: ReportRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'all', label: 'All' },
];

function rangeLabel(range: ReportRange) {
  if (range === '7d') return 'Last 7 days';
  if (range === 'all') return 'All time';
  return 'Today';
}

type ReportView = 'orders' | 'customers';

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>('today');
  const [view, setView] = useState<ReportView>('customers');
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [customers, setCustomers] = useState<CustomerReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  const fetchReport = useCallback(async (selected: ReportRange) => {
    setLoading(true);
    try {
      const [summaryData, ordersData, customersData] = await Promise.all([
        posReportsService.getSummary(selected),
        posOrdersService.list({ range: selected }),
        posReportsService.getCustomers(selected),
      ]);
      setSummary(summaryData);
      setOrders(ordersData);
      setCustomers(customersData);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  function openCustomer(name: string) {
    setSelectedCustomer(name);
    setCustomerDialogOpen(true);
  }

  useEffect(() => {
    void fetchReport(range);
  }, [range, fetchReport]);

  return (
    <PosShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card px-5 py-3 flex flex-wrap items-center gap-3">
          <BarChart3 className="h-5 w-5 text-bbq-flame" />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Reports</h1>
            <p className="text-xs text-muted-foreground">
              {rangeLabel(range)}
              {summary?.date && range !== 'all' ? ` · ${summary.date}` : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto font-display"
            onClick={() => fetchReport(range)}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="border-b border-border bg-card/60 px-5 py-3 flex flex-wrap gap-3 items-center">
          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            {(
              [
                { value: 'customers' as const, label: 'By guest' },
                { value: 'orders' as const, label: 'All orders' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setView(opt.value)}
                className={cn(
                  'rounded-lg px-4 py-2 font-display text-sm font-bold transition',
                  view === opt.value
                    ? 'bg-charcoal text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                className={cn(
                  'rounded-lg px-4 py-2 font-display text-sm font-bold transition',
                  range === opt.value
                    ? 'bg-bbq-flame text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
          {loading && !summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !summary ? null : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Completed Orders', value: summary.totalOrders, accent: 'text-foreground' },
                  { label: 'Total Revenue', value: `RM ${summary.totalRevenue.toFixed(2)}`, accent: 'text-bbq-green' },
                  { label: 'Cash', value: `RM ${summary.cashRevenue.toFixed(2)}`, accent: 'text-foreground' },
                  { label: 'QR Pay', value: `RM ${summary.qrRevenue.toFixed(2)}`, accent: 'text-bbq-flame' },
                ].map((card) => (
                  <Card key={card.label} size="sm">
                    <CardContent>
                      <p className="text-[10px] text-muted-foreground font-display font-bold uppercase tracking-wide">
                        {card.label}
                      </p>
                      <p className={`text-xl font-display font-black mt-1 tabular-nums ${card.accent}`}>
                        {card.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {summary.topItems.length > 0 && (
                <>
                  <Separator />
                  <Card>
                    <CardContent className="p-0! pt-4">
                      <p className="px-4 pb-3 font-display text-base font-bold">Top Selling Items</p>
                      {summary.topItems.map((item, i) => (
                        <div key={item.productId ?? item.name}>
                          <div className="flex items-center gap-3 px-4 py-2.5">
                            <span className="w-5 text-center font-display font-bold text-muted-foreground/50 tabular-nums">
                              {i + 1}
                            </span>
                            <span className="flex-1 font-semibold text-foreground text-sm">
                              {item.name}
                            </span>
                            <Badge variant="secondary" className="font-display tabular-nums">
                              {item.quantitySold} sold
                            </Badge>
                          </div>
                          {i < summary.topItems.length - 1 && <Separator />}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}

              <Separator />
              {view === 'customers' ? (
                <CustomerReportsTable
                  customers={customers}
                  loading={loading}
                  onSelect={openCustomer}
                />
              ) : (
                <OrdersHistoryTable orders={orders} loading={loading} />
              )}
            </>
          )}
        </div>
      </div>

      <CustomerOrdersDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        customerName={selectedCustomer}
        range={range}
      />
    </PosShell>
  );
}
