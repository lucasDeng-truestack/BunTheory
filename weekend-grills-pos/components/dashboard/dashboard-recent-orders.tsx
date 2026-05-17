'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { DashboardSummary } from '@/types/pos';

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case 'COMPLETED':
    case 'READY':
      return 'default';
    case 'PREPARING':
      return 'secondary';
    case 'CANCELLED':
      return 'destructive';
    case 'PLACED':
    default:
      return 'outline';
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  return d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
}

type Props = {
  orders: DashboardSummary['recentOrders'];
};

export function DashboardRecentOrders({ orders }: Props) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-display text-base">Recent Activity</CardTitle>
        <CardDescription>Latest orders today</CardDescription>
        <CardAction>
          <Link
            href="/complete-queue"
            className="font-display text-xs font-bold text-bbq-flame hover:underline underline-offset-2"
          >
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0!">
        {orders.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No orders yet today.
          </p>
        ) : (
          <ul>
            {orders.map((order, idx) => (
              <li key={order.id}>
                <div className="flex gap-3 px-4 py-3 transition-colors hover:bg-accent/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display font-bold text-sm text-foreground">
                        {order.orderNumber}
                      </span>
                      <Badge variant={statusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {order.customerName} · {order.itemsSummary}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-sm tabular-nums text-foreground">
                      RM {order.total.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                </div>
                {idx < orders.length - 1 && <Separator />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
