'use client';

import { useRouter } from 'next/navigation';
import { Flame, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useEffect } from 'react';
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

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full">
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

        <div className="mb-5 w-full space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between rounded-xl bg-stone-800/80 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-base font-bold leading-tight text-white">
                    {item.quantity}x {item.displayName}
                  </p>
                  {item.lineType === 'COMBO' ? (
                    <Badge className="bg-bbq-coral font-display text-[10px] text-white">Combo</Badge>
                  ) : null}
                </div>
                {item.choicesSummary ? (
                  <p className="mt-1 text-xs text-stone-400">{item.choicesSummary}</p>
                ) : null}
                {item.remarks.trim() ? (
                  <p className="mt-1 text-xs font-semibold text-stone-300">
                    Guest note · {item.remarks.trim()}
                  </p>
                ) : null}
              </div>
              <p className="ml-3 shrink-0 font-display text-base font-black tabular-nums text-bbq-coral">
                RM {(item.unitPrice * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="w-full rounded-xl bg-bbq-flame px-5 py-4 flex justify-between items-center mb-6">
          <span className="text-lg font-bold text-white font-display">TOTAL</span>
          <span className="text-2xl font-black text-white font-display tabular-nums">
            RM {cartTotal.toFixed(2)}
          </span>
        </div>

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
