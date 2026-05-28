'use client';

import { PosOrder } from '@/types/pos';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  orders: PosOrder[];
  loading?: boolean;
};

export function OrdersHistoryTable({ orders, loading }: Props) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-display text-base">Past Orders</CardTitle>
      </CardHeader>
      <CardContent className="p-0!">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No orders in this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Order #', 'Guest', 'Status', 'Payment', 'Total', 'Date'].map(
                    (h) => (
                      <th
                        key={h}
                        className={cn(
                          'px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted-foreground',
                          h === 'Total' && 'text-right',
                        )}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/60 hover:bg-accent/20">
                    <td className="px-4 py-3 font-display font-bold whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.paymentMethod === 'CASH' ? 'Cash' : 'QR Pay'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      RM {order.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
