'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Banknote, CreditCard } from 'lucide-react';

type Props = {
  cashRevenue: number;
  qrRevenue: number;
  totalRevenue: number;
};

export function DashboardRevenueSplit({ cashRevenue, qrRevenue, totalRevenue }: Props) {
  const cashPct = totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0;
  const qrPct = totalRevenue > 0 ? 100 - cashPct : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Payment Split
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalRevenue > 0 && (
          <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
            <div
              className="bg-bbq-green transition-all"
              style={{ width: `${cashPct}%` }}
            />
            <div
              className="bg-bbq-flame transition-all"
              style={{ width: `${qrPct}%` }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-green-100 p-1.5">
              <Banknote className="h-4 w-4 text-bbq-green" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Cash</p>
              <p className="font-display font-bold text-sm tabular-nums">
                RM {cashRevenue.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-teal-100 p-1.5">
              <CreditCard className="h-4 w-4 text-bbq-flame" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">QR Pay</p>
              <p className="font-display font-bold text-sm tabular-nums">
                RM {qrRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
