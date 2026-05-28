'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { DashboardSummary } from '@/types/pos';

type Props = {
  sections: DashboardSummary['salesBySection'];
};

export function DashboardSalesBySectionTable({ sections }: Props) {
  const totalRevenue = sections.reduce((s, r) => s + r.revenue, 0);

  return (
    <Card>
      <CardHeader className="border-b flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-bbq-flame" />
            Sales by Menu Section
          </CardTitle>
          <CardDescription>Last 7 days — completed orders</CardDescription>
        </div>
        <Link
          href="/order-menu"
          className="font-display text-xs font-bold text-bbq-flame hover:underline underline-offset-2"
        >
          View menu ↗
        </Link>
      </CardHeader>
      <CardContent className="p-0!">
        {sections.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No section sales in the last 7 days.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Section', 'Orders', 'Qty Sold', 'Revenue'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left font-display text-xs font-bold uppercase tracking-wide text-muted-foreground last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sections.map((row) => {
                  const pct =
                    totalRevenue > 0
                      ? Math.round((row.revenue / totalRevenue) * 1000) / 10
                      : 0;
                  return (
                    <tr key={row.sectionName} className="border-b border-border/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{row.sectionName}</p>
                        <div className="mt-1.5 h-1.5 max-w-[140px] overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-bbq-flame"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{pct}%</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.orders}</td>
                      <td className="px-4 py-3 tabular-nums">{row.quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        RM {row.revenue.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-display font-bold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 tabular-nums">
                    {sections.reduce((s, r) => s + r.orders, 0)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {sections.reduce((s, r) => s + r.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-bbq-flame">
                    RM {totalRevenue.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
