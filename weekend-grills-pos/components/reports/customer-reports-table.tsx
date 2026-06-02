'use client';

import { CustomerReportSummary } from '@/types/pos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

type Props = {
  customers: CustomerReportSummary[];
  loading?: boolean;
  onSelect: (customerName: string) => void;
};

export function CustomerReportsTable({ customers, loading, onSelect }: Props) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-display text-base">Guests & orders</CardTitle>
        <p className="text-xs text-muted-foreground font-normal">
          Tap a guest to see everything they ordered in this period.
        </p>
      </CardHeader>
      <CardContent className="p-0!">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No guest orders in this period.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {customers.map((row) => (
              <li key={row.customerName}>
                <button
                  type="button"
                  onClick={() => onSelect(row.customerName)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition',
                    'hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bbq-flame/40',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-foreground truncate">
                      {row.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {row.recentItemsPreview || '—'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Last order {formatDateTime(row.lastOrderAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right flex items-center gap-2">
                    <Badge variant="secondary" className="font-display tabular-nums">
                      {row.orderCount} order{row.orderCount === 1 ? '' : 's'}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums hidden sm:inline">
                      RM {row.totalSpent.toFixed(2)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
