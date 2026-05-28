'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DashboardSummary } from '@/types/pos';

type Props = {
  pipeline: DashboardSummary['pipeline'];
};

export function DashboardPipelineBars({ pipeline }: Props) {
  const total = pipeline.placed + pipeline.preparing + pipeline.ready;
  const rows = [
    {
      label: 'New orders',
      count: pipeline.placed,
      barClass: 'bg-bbq-flame',
      badge: pipeline.placed > 0 ? `${pipeline.placed} waiting` : '0 waiting',
    },
    {
      label: 'Preparing',
      count: pipeline.preparing,
      barClass: 'bg-bbq-mango',
      badge: `${pipeline.preparing} cooking`,
    },
    {
      label: 'Ready',
      count: pipeline.ready,
      barClass: 'bg-bbq-green',
      badge: `${pipeline.ready} ready`,
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="font-display text-base">Order Pipeline</CardTitle>
            <CardDescription>Live kitchen queue</CardDescription>
          </div>
          <Badge variant="outline" className="font-display text-[10px]">
            {total} active
          </Badge>
        </div>
        <Link
          href="/kitchen-queue"
          className="font-display text-xs font-bold text-bbq-flame hover:underline underline-offset-2"
        >
          Open kitchen ↗
        </Link>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="font-display font-bold tabular-nums">{row.count}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${row.barClass}`}
                  style={{ width: `${total > 0 ? Math.max(pct, row.count > 0 ? 8 : 0) : 0}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{row.badge}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
