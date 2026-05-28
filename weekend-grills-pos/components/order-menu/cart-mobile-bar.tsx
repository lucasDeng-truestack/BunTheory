'use client';

import { ChevronUp, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { cn } from '@/lib/utils';

type CartMobileBarProps = {
  onOpen: () => void;
};

export function CartMobileBar({ onOpen }: CartMobileBarProps) {
  const count = useCartStore((s) => s.itemCount());
  const orderTotal = useCartStore((s) => s.payableTotal());

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'fixed inset-x-0 bottom-16 z-40 flex items-center gap-3 border-t border-border bg-card px-4 py-3 shadow-[0_-8px_24px_rgb(0_0_0/0.12)]',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
      )}
      aria-label={
        count > 0
          ? `Open current order, ${count} items, total RM ${orderTotal.toFixed(2)}`
          : 'Open current order'
      }
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bbq-flame/15 text-bbq-flame">
        <ShoppingBag className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="font-display block text-sm font-bold text-foreground">
          Current order
        </span>
        <span className="block text-xs text-muted-foreground">
          {count > 0
            ? `${count} item${count !== 1 ? 's' : ''} · RM ${orderTotal.toFixed(2)}`
            : 'Tap to add guest name & review items'}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-display text-xs font-bold text-bbq-flame">
        View
        <ChevronUp className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}
