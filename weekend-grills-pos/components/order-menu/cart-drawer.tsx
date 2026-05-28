'use client';

import { ShoppingBag, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Dialog, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CartPanel } from '@/components/order-menu/cart-panel';
import { cn } from '@/lib/utils';

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: () => void;
};

export function CartDrawer({ open, onOpenChange, onReview }: CartDrawerProps) {
  function handleReview() {
    onOpenChange(false);
    onReview();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-60 bg-black/45 duration-200 supports-backdrop-filter:backdrop-blur-xs',
            'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed inset-0 z-60 flex flex-col bg-card text-foreground shadow-xl outline-none',
            'data-open:animate-in data-open:slide-in-from-bottom duration-300',
            'data-closed:animate-out data-closed:slide-out-to-bottom duration-200',
          )}
        >
          <div className="shrink-0 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/25" aria-hidden />
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <ShoppingBag className="h-5 w-5 shrink-0 text-bbq-flame" />
                <DialogPrimitive.Title className="font-display text-lg font-bold text-foreground">
                  Current order
                </DialogPrimitive.Title>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={() => onOpenChange(false)}
                aria-label="Close current order"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <DialogPrimitive.Description className="sr-only">
              Review items, guest details, and send the order to the kitchen.
            </DialogPrimitive.Description>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <CartPanel variant="embedded" onReview={handleReview} />
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
