'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, Wifi } from 'lucide-react';
import { PosShell } from '@/components/layout/pos-shell';
import { KitchenOrderCard } from '@/components/kitchen/kitchen-order-card';
import { posOrdersService } from '@/services/pos-orders.service';
import { usePosSocket } from '@/hooks/usePosSocket';
import { PosOrder } from '@/types/pos';
import {
  sortOrdersOldestFirst,
  upsertOrderOldestFirst,
} from '@/lib/pos-order-sort';

export default function ReadyQueuePage() {
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const ready = await posOrdersService.list({ status: 'READY', sort: 'asc' });
      setOrders(ready);
    } catch {
      toast.error('Failed to load ready queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  usePosSocket({
    onOrderUpdated: (order) => {
      if (order.status === 'READY') {
        setOrders((prev) => {
          const exists = prev.find((o) => o.id === order.id);
          const next = upsertOrderOldestFirst(prev, order);
          if (!exists) {
            toast.success(`${order.orderNumber} is ready for pickup!`);
          }
          return next;
        });
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      }
    },
  });

  async function handleAdvance(id: string) {
    try {
      await posOrdersService.advance(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order');
    }
  }

  return (
    <PosShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card px-5 py-3 flex items-center gap-3">
          <Bell className="h-5 w-5 text-bbq-green" />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Ready for Pickup</h1>
            <p className="text-xs text-muted-foreground">
              {orders.length} order{orders.length !== 1 ? 's' : ''} ready
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-bbq-green font-display font-semibold">
            <Wifi className="h-3.5 w-3.5" />
            Live
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="font-display font-semibold">No orders ready yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {orders.map((order) => (
                <KitchenOrderCard key={order.id} order={order} onAdvance={handleAdvance} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PosShell>
  );
}
