'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PosOrder } from '@/types/pos';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface KitchenOrderCardProps {
  order: PosOrder;
  onAdvance: (id: string) => Promise<void>;
}

function useElapsed(createdAt: string) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    function update() {
      const diff = Math.floor(
        (Date.now() - new Date(createdAt).getTime()) / 1000,
      );
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(m > 0 ? `${m}m ${s}s` : `${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  return elapsed;
}

const statusConfig = {
  PLACED: {
    card: 'kitchen-card-placed',
    buttonClass: 'bg-bbq-flame hover:bg-bbq-flame/90 text-white',
    label: 'Start Cooking',
  },
  PREPARING: {
    card: 'kitchen-card-preparing',
    buttonClass: 'bg-bbq-mango hover:bg-bbq-mango/90 text-foreground',
    label: 'Mark Ready',
  },
  READY: {
    card: 'kitchen-card-ready',
    buttonClass: 'bg-bbq-green hover:bg-bbq-green/90 text-white',
    label: 'Complete Order',
  },
} as const;

export function KitchenOrderCard({ order, onAdvance }: KitchenOrderCardProps) {
  const elapsed = useElapsed(order.createdAt);
  const [advancing, setAdvancing] = useState(false);

  async function handleAdvance() {
    setAdvancing(true);
    try {
      await onAdvance(order.id);
    } finally {
      setAdvancing(false);
    }
  }

  const config = statusConfig[order.status as keyof typeof statusConfig];
  if (!config) return null;

  return (
    <Card className={cn('overflow-hidden', config.card)} size="sm">
      <CardHeader>
        <CardTitle className="font-display font-black text-base">
          {order.orderNumber}
        </CardTitle>
        <CardDescription className="font-semibold text-foreground/80">
          {order.customerName}
        </CardDescription>
        <CardAction className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground font-mono">{elapsed}</span>
        </CardAction>
      </CardHeader>

      <Separator className="mx-3" />

      <CardContent className="space-y-1.5 overflow-y-auto max-h-44">
        {order.items.map((item) => (
          <div key={item.id}>
            <p className="font-semibold text-foreground text-sm">
              <span className="text-bbq-flame font-display">{item.quantity}x</span>{' '}
              {item.displayName}
            </p>
            {item.choicesSummary ? (
              <p className="text-[11px] text-muted-foreground ml-5">{item.choicesSummary}</p>
            ) : null}
            {item.remarks?.trim() ? (
              <p className="text-[11px] font-semibold text-amber-800 ml-5">
                Guest note · {item.remarks.trim()}
              </p>
            ) : null}
          </div>
        ))}

        {order.notes && (
          <div className="rounded-md bg-yellow-100 text-yellow-800 text-[11px] px-2 py-1 mt-1">
            {order.notes}
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t-0 bg-transparent p-3">
        <Button
          onClick={handleAdvance}
          disabled={advancing}
          className={cn('w-full font-display font-bold', config.buttonClass)}
        >
          {advancing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            config.label
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
