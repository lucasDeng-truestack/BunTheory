'use client';

import { useRouter } from 'next/navigation';
import { Flame, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useEffect } from 'react';
import { segmentBundledCart } from '@/lib/cart-bundles';
import { Badge } from '@/components/ui/badge';

export default function CustomerReviewPage() {
  const router = useRouter();
  const { isAuthenticated, hydrated, hydrate } = useAuthStore();
  const { items, customerName, serviceType, paymentMethod, total } = useCartStore();
  const cartTotal = total();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace('/login');
  }, [hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (items.length === 0) {
      router.replace('/order-menu');
    }
  }, [items.length, router]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bbq-charcoal flex flex-col">
      {/* Staff-only thin bar */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-stone-700/60">
        <button
          onClick={() => router.back()}
          className="text-stone-400 hover:text-white flex items-center gap-1 text-sm transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Cart
        </button>
        <span className="ml-auto text-xs text-stone-500 font-display">
          Turn iPad to customer
        </span>
      </div>

      {/* Customer-facing content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <Flame className="h-9 w-9 text-bbq-coral" />
          <span className="font-display text-2xl font-black text-bbq-coral tracking-wide">
            WEEKEND GRILLS
          </span>
        </div>

        <h2 className="font-display text-2xl md:text-3xl font-black text-white mb-1 text-center">
          Your Order Summary
        </h2>
        <p className="text-stone-400 text-sm mb-6 text-center">
          Please confirm your order below
        </p>

        {/* Info pills */}
        <div className="flex gap-3 mb-5 w-full">
          <div className="flex-1 rounded-xl bg-stone-800/80 px-3 py-2.5 text-center">
            <p className="text-[10px] text-stone-500 mb-0.5 font-display uppercase tracking-wide">Name</p>
            <p className="text-base font-bold text-white font-display">{customerName}</p>
          </div>
          <div className="flex-1 rounded-xl bg-stone-800/80 px-3 py-2.5 text-center">
            <p className="text-[10px] text-stone-500 mb-0.5 font-display uppercase tracking-wide">Service</p>
            <p className="text-base font-bold text-bbq-coral font-display">
              {serviceType === 'EAT_HERE' ? 'Eat Here' : 'Takeaway'}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-stone-800/80 px-3 py-2.5 text-center">
            <p className="text-[10px] text-stone-500 mb-0.5 font-display uppercase tracking-wide">Payment</p>
            <p className="text-base font-bold text-white font-display">
              {paymentMethod === 'CASH' ? 'Cash' : 'QR Pay'}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="mb-5 w-full space-y-4">
          {segmentBundledCart(items).map((seg, i) =>
            seg.type === 'single' ? (
              <div
                key={seg.item.id}
                className="flex items-start justify-between rounded-xl bg-stone-800/80 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold leading-tight text-white">
                    {seg.item.quantity}x {seg.item.name}
                  </p>
                  {seg.item.remarks.trim() ? (
                    <p className="mt-1 text-xs font-semibold text-stone-300">
                      Guest note · {seg.item.remarks.trim()}
                    </p>
                  ) : null}
                </div>
                <p className="ml-3 shrink-0 font-display text-base font-black tabular-nums text-bbq-coral">
                  RM {(seg.item.unitPrice * seg.item.quantity).toFixed(2)}
                </p>
              </div>
            ) : (
              <div
                key={`${seg.bundleId}-${i}`}
                className="space-y-2 rounded-xl border border-bbq-coral/35 bg-stone-800/55 p-3"
              >
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <Badge className="bg-bbq-coral font-display text-[10px] text-white">Meal</Badge>
                  <span className="font-display text-sm font-black text-stone-100">
                    {seg.title}
                  </span>
                </div>
                {seg.lines.map((line) => {
                  const slot =
                    line.mealLineKind === 'MAIN'
                      ? 'Main'
                      : line.mealLineKind === 'SIDE'
                        ? 'Side'
                        : line.mealLineKind === 'DRINK_ADDON'
                          ? 'Drink'
                          : null;
                  return (
                    <div
                      key={line.id}
                      className="flex items-start justify-between rounded-lg bg-stone-900/50 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        {slot ? (
                          <p className="mb-0.5 text-[10px] font-display font-bold uppercase tracking-wide text-stone-500">
                            {slot}
                          </p>
                        ) : null}
                        <p className="font-display text-sm font-bold leading-tight text-white">
                          {line.quantity}x {line.name}
                        </p>
                        {line.remarks.trim() ? (
                          <p className="mt-1 text-xs font-semibold text-stone-300">
                            Guest note · {line.remarks.trim()}
                          </p>
                        ) : null}
                      </div>
                      <p className="ml-2 shrink-0 font-display text-sm font-black tabular-nums text-bbq-coral">
                        RM {(line.unitPrice * line.quantity).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ),
          )}
        </div>

        {/* Total */}
        <div className="w-full rounded-xl bg-bbq-flame px-5 py-4 flex justify-between items-center mb-6">
          <span className="text-lg font-bold text-white font-display">TOTAL</span>
          <span className="text-2xl font-black text-white font-display tabular-nums">
            RM {cartTotal.toFixed(2)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="flex-1 rounded-xl py-7 text-base font-display font-bold border-2 border-stone-600 bg-stone-800 text-stone-200 hover:bg-stone-700"
          >
            Need Changes
          </Button>
          <Button
            onClick={() => router.push('/payment')}
            className="flex-1 rounded-xl py-7 text-base font-display font-bold bg-bbq-flame hover:bg-bbq-flame/90 text-white"
          >
            Looks Good!
          </Button>
        </div>
      </div>
    </div>
  );
}
