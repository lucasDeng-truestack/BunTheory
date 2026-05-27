'use client';

import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { CartItem } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCartStore, type CartDiscountPercent } from '@/store/cart.store';
import { cn } from '@/lib/utils';

interface CartPanelProps {
  onReview: () => void;
}

function CartLineRow({
  item,
  updateQuantity,
  updateRemarks,
  removeItem,
}: {
  item: CartItem;
  updateQuantity: (id: string, qty: number) => void;
  updateRemarks: (id: string, r: string) => void;
  removeItem: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <p className="truncate font-semibold text-xs leading-tight text-foreground">
            {item.displayName}
          </p>
          {item.lineType === 'COMBO' ? (
            <Badge variant="outline" className="h-5 px-1.5 font-display text-[10px]">
              Combo
            </Badge>
          ) : null}
        </div>
        {item.choicesSummary ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{item.choicesSummary}</p>
        ) : null}
        <label className="mt-2 block">
          <span className="text-[10px] font-display font-bold uppercase tracking-wide text-muted-foreground">
            Guest note (kitchen + receipt)
          </span>
          <Textarea
            value={item.remarks}
            onChange={(e) => updateRemarks(item.id, e.target.value)}
            placeholder="Allergies, no ice…"
            rows={2}
            className="mt-1 min-h-[2.75rem] resize-none font-sans text-[11px] placeholder:text-muted-foreground/70"
          />
        </label>
        <p className="mt-2 text-[11px] font-bold tabular-nums text-bbq-flame">
          RM {(item.unitPrice * item.quantity).toFixed(2)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-6 w-6"
          onClick={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-5 text-center text-xs font-bold tabular-nums">
          {item.quantity}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-6 w-6"
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => removeItem(item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function CartPanel({ onReview }: CartPanelProps) {
  const {
    items,
    updateQuantity,
    updateRemarks,
    removeItem,
    total,
    itemCount,
    serviceType,
    setServiceType,
    customerName,
    setCustomerName,
    paymentMethod,
    setPaymentMethod,
    discountPercent,
    setDiscountPercent,
    discountAmount,
    payableTotal,
  } = useCartStore();

  const count = itemCount();
  const cartTotal = total();
  const discount = discountAmount();
  const orderTotal = payableTotal();

  function toggleDiscount(percent: CartDiscountPercent) {
    if (percent === 0) return;
    setDiscountPercent(discountPercent === percent ? 0 : percent);
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex shrink-0 items-center justify-between bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-bbq-flame" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
            Current order
          </h2>
        </div>
        {count > 0 ? (
          <Badge variant="default" className="bg-bbq-flame px-1.5 py-0.5 font-display text-[10px] text-white">
            {count}
          </Badge>
        ) : null}
      </div>

      <Separator />

      <div className="px-4 pt-3">
        <label className="mb-1 block text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          Guest name
        </label>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Amir"
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="px-4 pb-1 pt-2.5">
        <label className="mb-1 block text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          Service
        </label>
        <div className="flex overflow-hidden rounded-lg border border-input bg-muted/30">
          {(['EAT_HERE', 'TAKEAWAY'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setServiceType(t)}
              className={cn(
                'flex-1 py-2 font-display text-xs font-bold transition-all',
                serviceType === t
                  ? 'bg-bbq-flame text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'EAT_HERE' ? 'Eat here' : 'Takeaway'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-1 pt-2.5">
        <label className="mb-1 block text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          Payment type
        </label>
        <div className="flex overflow-hidden rounded-lg border border-input bg-muted/30">
          {(['CASH', 'QR'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={cn(
                'flex-1 py-2 font-display text-xs font-bold transition-all',
                paymentMethod === method
                  ? 'bg-bbq-teal text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {method === 'CASH' ? 'Cash' : 'QR Pay'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-4 py-2.5">
        {items.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
            <ShoppingBag className="mb-2 h-6 w-6 opacity-30" />
            <p className="font-display text-xs">No items added</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <CartLineRow
                key={item.id}
                item={item}
                updateQuantity={updateQuantity}
                updateRemarks={updateRemarks}
                removeItem={removeItem}
              />
            ))}
          </div>
        )}
      </div>

      {items.length > 0 ? (
        <div className="space-y-2.5 border-t border-border bg-card px-4 py-3">
          <div>
            <p className="mb-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">
              Discount
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleDiscount(5)}
                className={cn(
                  'flex-1 rounded-lg border-2 py-2 font-display text-xs font-bold transition',
                  discountPercent === 5
                    ? 'border-bbq-flame bg-accent text-bbq-flame'
                    : 'border-border text-muted-foreground hover:border-bbq-flame/30',
                )}
              >
                5% off
              </button>
              <button
                type="button"
                onClick={() => toggleDiscount(10)}
                className={cn(
                  'flex-1 rounded-lg border-2 py-2 font-display text-xs font-bold transition',
                  discountPercent === 10
                    ? 'border-bbq-flame bg-accent text-bbq-flame'
                    : 'border-border text-muted-foreground hover:border-bbq-flame/30',
                )}
              >
                10% off
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-display">Subtotal</span>
            <span className="tabular-nums">RM {cartTotal.toFixed(2)}</span>
          </div>
          {discount > 0 ? (
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
              <span className="font-display">Discount ({discountPercent}%)</span>
              <span className="tabular-nums">− RM {discount.toFixed(2)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-bold">TOTAL</span>
            <span className="font-display text-base font-black tabular-nums text-bbq-flame">
              RM {orderTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => useCartStore.getState().clearCart()}
              className="flex-1 border-destructive/30 font-display text-sm py-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Clear
            </Button>
            <Button
              onClick={onReview}
              disabled={!customerName.trim()}
              className="flex-1 bg-bbq-flame font-display text-sm py-5 text-white shadow-sm hover:bg-bbq-flame/90"
            >
              Send order
            </Button>
          </div>
          {!customerName.trim() ? (
            <p className="text-center text-[10px] text-muted-foreground">
              Enter guest name to continue
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
