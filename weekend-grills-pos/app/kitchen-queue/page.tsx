'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wifi } from 'lucide-react';
import { PosShell } from '@/components/layout/pos-shell';
import { KitchenOrderCard } from '@/components/kitchen/kitchen-order-card';
import { posOrdersService } from '@/services/pos-orders.service';
import { usePosSocket } from '@/hooks/usePosSocket';
import { PosOrder } from '@/types/pos';
import {
  sortOrdersOldestFirst,
  upsertOrderOldestFirst,
} from '@/lib/pos-order-sort';

export default function KitchenQueuePage() {
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueues = useCallback(async () => {
    try {
      const [placed, preparing] = await Promise.all([
        posOrdersService.list({ status: 'PLACED', sort: 'asc' }),
        posOrdersService.list({ status: 'PREPARING', sort: 'asc' }),
      ]);
      setOrders(sortOrdersOldestFirst([...placed, ...preparing]));
    } catch {
      toast.error('Failed to load kitchen queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  usePosSocket({
    onOrderCreated: (order) => {
      if (order.status === 'PLACED' || order.status === 'PREPARING') {
        setOrders((prev) => upsertOrderOldestFirst(prev, order));
        toast.info(`New order: ${order.orderNumber} — ${order.customerName}`);
      }
    },
    onOrderUpdated: (order) => {
      setOrders((prev) => {
        if (order.status === 'PLACED' || order.status === 'PREPARING') {
          return upsertOrderOldestFirst(prev, order);
        }
        return prev.filter((o) => o.id !== order.id);
      });
    },
  });

  async function handleAdvance(id: string) {
    try {
      await posOrdersService.advance(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order');
    }
  }

  async function handleRevertToPlaced(id: string) {
    try {
      await posOrdersService.revertToPlaced(id);
      toast.success('Moved back to new orders');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to move order back',
      );
    }
  }

  const placed = sortOrdersOldestFirst(orders.filter((o) => o.status === 'PLACED'));
  const preparing = sortOrdersOldestFirst(
    orders.filter((o) => o.status === 'PREPARING'),
  );

  return (
    <PosShell>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-5 py-3 flex items-center gap-3">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Kitchen Queue</h1>
            <p className="text-xs text-muted-foreground">
              {orders.length} active order{orders.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-bbq-green font-display font-semibold">
            <Wifi className="h-3.5 w-3.5" />
            Live
          </div>
        </div>

        {/* Queues */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* New Orders */}
          <section className="flex-1 md:border-r border-border flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 bg-orange-50/50 border-b border-orange-100/60">
              <h2 className="font-display font-bold text-orange-700 text-xs uppercase tracking-wide">
                New Orders
                {placed.length > 0 && (
                  <span className="ml-2 rounded-full bg-bbq-flame text-white px-2 py-0.5 text-[10px]">
                    {placed.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 md:p-4 grid grid-cols-1 gap-3 content-start auto-rows-min">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
                ))
              ) : placed.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-muted-foreground">
                  <p className="text-sm font-display">No new orders</p>
                </div>
              ) : (
                placed.map((order) => (
                  <KitchenOrderCard key={order.id} order={order} onAdvance={handleAdvance} />
                ))
              )}
            </div>
          </section>

          {/* Preparing */}
          <section className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 bg-yellow-50/50 border-b border-yellow-100/60">
              <h2 className="font-display font-bold text-yellow-700 text-xs uppercase tracking-wide">
                Preparing
                {preparing.length > 0 && (
                  <span className="ml-2 rounded-full bg-bbq-mango text-foreground px-2 py-0.5 text-[10px]">
                    {preparing.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 md:p-4 grid grid-cols-1 gap-3 content-start auto-rows-min">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
                ))
              ) : preparing.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-muted-foreground">
                  <p className="text-sm font-display">Nothing cooking</p>
                </div>
              ) : (
                preparing.map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvance}
                    onRevertToPlaced={handleRevertToPlaced}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </PosShell>
  );
}
