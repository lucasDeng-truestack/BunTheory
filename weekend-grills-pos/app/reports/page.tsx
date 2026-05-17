'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, RefreshCw } from 'lucide-react';
import { PosShell } from '@/components/layout/pos-shell';
import { posReportsService } from '@/services/pos-reports.service';
import { DailySummary } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function ReportsPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await posReportsService.getDaily();
      setSummary(data);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <PosShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card px-5 py-3 flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-bbq-flame" />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Daily Reports</h1>
            <p className="text-xs text-muted-foreground">
              {summary?.date ?? new Date().toISOString().slice(0, 10)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto font-display"
            onClick={fetchSummary}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : !summary ? null : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Total Orders', value: summary.totalOrders, accent: 'text-foreground' },
                  { label: 'Total Revenue', value: `RM ${summary.totalRevenue.toFixed(2)}`, accent: 'text-bbq-green' },
                  { label: 'Cash', value: `RM ${summary.cashRevenue.toFixed(2)}`, accent: 'text-foreground' },
                  { label: 'QR Pay', value: `RM ${summary.qrRevenue.toFixed(2)}`, accent: 'text-bbq-flame' },
                  { label: 'Eat Here', value: summary.eatHereOrders, accent: 'text-blue-700' },
                  { label: 'Takeaway', value: summary.takeawayOrders, accent: 'text-amber-700' },
                ].map((card) => (
                  <Card key={card.label} size="sm">
                    <CardContent>
                      <p className="text-[10px] text-muted-foreground font-display font-bold uppercase tracking-wide">{card.label}</p>
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
                    <CardHeader className="border-b">
                      <CardTitle className="font-display text-base">Top Selling Items</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0!">
                      {summary.topItems.map((item, i) => (
                        <div key={item.menuItemId}>
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
            </>
          )}
        </div>
      </div>
    </PosShell>
  );
}
