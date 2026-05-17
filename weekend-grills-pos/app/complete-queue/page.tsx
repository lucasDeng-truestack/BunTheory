'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import { PosShell } from '@/components/layout/pos-shell';
import { posOrdersService } from '@/services/pos-orders.service';
import { usePosSocket } from '@/hooks/usePosSocket';
import { PosOrder } from '@/types/pos';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function OrderRow({ order }: { order: PosOrder }) {
  const time = new Date(order.createdAt).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-0.5 w-16 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground">{time}</span>
          <span className="font-display font-bold text-foreground text-sm">{order.orderNumber}</span>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate text-sm">{order.customerName}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {order.items
              .map((i) => {
                const base = `${i.quantity}x ${i.menuItemName}`;
                const r = i.remarks?.trim();
                return r ? `${base} — “${r}”` : base;
              })
              .join(', ')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <Badge variant={order.serviceType === 'EAT_HERE' ? 'secondary' : 'outline'}>
            {order.serviceType === 'EAT_HERE' ? 'Eat Here' : 'Takeaway'}
          </Badge>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {order.paymentMethod} · RM {order.total.toFixed(2)}
          </span>
        </div>
        <CheckCircle className="h-4 w-4 text-bbq-green shrink-0" />
      </CardContent>
    </Card>
  );
}

export default function CompleteQueuePage() {
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const completed = await posOrdersService.list({
        status: 'COMPLETED',
        date: today,
      });
      setOrders(completed);
    } catch {
      toast.error('Failed to load completed orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  usePosSocket({
    onOrderUpdated: (order) => {
      if (order.status === 'COMPLETED') {
        setOrders((prev) => {
          const exists = prev.find((o) => o.id === order.id);
          if (exists) return prev;
          return [order, ...prev];
        });
      }
    },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const cashTotal = orders
    .filter((o) => o.paymentMethod === 'CASH')
    .reduce((sum, o) => sum + o.total, 0);
  const qrTotal = orders
    .filter((o) => o.paymentMethod === 'QR')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <PosShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card px-5 py-3">
          <h1 className="font-display text-lg font-bold text-foreground">Completed Orders</h1>
          <p className="text-xs text-muted-foreground">Today&apos;s completed orders</p>
        </div>

        {orders.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 px-5 py-2.5 bg-green-50/50 border-b border-green-100/60">
            <div className="text-xs">
              <span className="text-muted-foreground">Orders: </span>
              <span className="font-display font-bold text-foreground">{orders.length}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Revenue: </span>
              <span className="font-display font-bold text-bbq-green tabular-nums">
                RM {totalRevenue.toFixed(2)}
              </span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Cash: </span>
              <span className="font-display font-bold tabular-nums">RM {cashTotal.toFixed(2)}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">QR: </span>
              <span className="font-display font-bold tabular-nums">RM {qrTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 opacity-30" />
              <p className="font-display font-semibold">No completed orders yet today</p>
            </div>
          ) : (
            orders.map((order) => <OrderRow key={order.id} order={order} />)
          )}
        </div>
      </div>
    </PosShell>
  );
}
