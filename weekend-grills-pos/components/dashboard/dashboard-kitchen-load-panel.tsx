'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { DashboardSummary } from '@/types/pos';

type Props = {
  load: DashboardSummary['kitchenLoad'];
  pipeline: DashboardSummary['pipeline'];
};

export function DashboardKitchenLoadPanel({ load, pipeline }: Props) {
  const rows = [
    {
      label: 'New (Placed)',
      pct: load.placedPct,
      count: pipeline.placed,
      barClass: 'bg-bbq-flame',
      textClass: 'text-bbq-flame',
    },
    {
      label: 'Preparing',
      pct: load.preparingPct,
      count: pipeline.preparing,
      barClass: 'bg-bbq-mango',
      textClass: 'text-amber-700',
    },
    {
      label: 'Ready',
      pct: load.readyPct,
      count: pipeline.ready,
      barClass: 'bg-bbq-green',
      textClass: 'text-bbq-green',
    },
  ];

  const total = pipeline.placed + pipeline.preparing + pipeline.ready;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-display text-base">Kitchen Load</CardTitle>
        <CardDescription>Live pipeline distribution</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className={`font-display font-bold tabular-nums ${row.textClass}`}>
                {row.pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${row.barClass}`}
                style={{ width: `${Math.min(100, row.pct)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{row.count} orders</p>
          </div>
        ))}
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Active in kitchen
          </p>
          <p className="font-display text-2xl font-black tabular-nums text-foreground">
            {total}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
