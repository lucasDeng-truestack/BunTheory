'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { posReportsService } from '@/services/pos-reports.service';
import { CustomerOrdersResponse, ReportRange } from '@/types/pos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string | null;
  range: ReportRange;
};

export function CustomerOrdersDialog({
  open,
  onOpenChange,
  customerName,
  range,
}: Props) {
  const [data, setData] = useState<CustomerOrdersResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !customerName) {
      setData(null);
      return;
    }
    setLoading(true);
    posReportsService
      .getCustomerOrders(customerName, range)
      .then(setData)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to load orders');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [open, customerName, range]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {customerName ?? 'Guest'} — orders
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !data || data.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No orders found for this guest in the selected period.
          </p>
        ) : (
          <div className="space-y-4">
            {data.orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-bold">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="font-display text-[10px]">
                      {order.status}
                    </Badge>
                    <p className="font-display font-black tabular-nums mt-1">
                      RM {order.total.toFixed(2)}
                    </p>
                  </div>
                </div>
                <Separator />
                <ul className="space-y-1.5 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span className="font-semibold">
                        {item.quantity}× {item.displayName}
                      </span>
                      {item.choicesSummary ? (
                        <span className="text-muted-foreground">
                          {' '}
                          ({item.choicesSummary})
                        </span>
                      ) : null}
                      {item.remarks ? (
                        <p className="text-xs text-muted-foreground italic">
                          {item.remarks}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
