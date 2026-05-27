'use client';

import { useRouter } from 'next/navigation';
import { Flame, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart.store';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

export default function CustomerReviewPage() {
  const router = useRouter();
  const { ready } = useStaffAuth();
  const { items, customerName, serviceType, paymentMethod, total } = useCartStore();
  const cartTotal = total();

  useEffect(() => {
    if (!ready) return;
    if (items.length === 0) {
      router.replace('/order-menu');
    }
  }, [ready, items.length, router]);

  if (!ready) return null;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bbq-charcoal flex flex-col">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-stone-700/60">
        <button
          onClick={() => router.push('/order-menu')}
          className="text-stone-400 hover:text-white flex items-center gap-1.5 text-base transition font-display"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to Cart
        </button>
        <Badge variant="secondary" className="ml-auto font-display text-xs px-2.5 py-0.5">
          Step 2 · Summary
        </Badge>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 md:px-10 md:py-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <Flame className="h-12 w-12 md:h-16 md:w-16 text-bbq-coral" />
          <span className="font-display text-3xl md:text-4xl font-black text-bbq-coral tracking-wide">
            WEEKEND GRILLS
          </span>
        </div>

        <h2 className="font-display text-3xl md:text-4xl font-black text-white mb-2 text-center">
          Your Order Summary
        </h2>
        <p className="text-stone-400 text-lg md:text-xl mb-8 text-center">
          Please confirm your order below
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6 w-full">
          <div className="flex-1 rounded-xl bg-stone-800/80 px-4 py-4 text-center">
            <p className="text-xs md:text-sm text-stone-500 mb-1 font-display uppercase tracking-wide">Name</p>
            <p className="text-xl md:text-2xl font-bold text-white font-display">{customerName}</p>
          </div>
          <div className="flex-1 rounded-xl bg-stone-800/80 px-4 py-4 text-center">
            <p className="text-xs md:text-sm text-stone-500 mb-1 font-display uppercase tracking-wide">Service</p>
            <p className="text-xl md:text-2xl font-bold text-bbq-coral font-display">
              {serviceType === 'EAT_HERE' ? 'Eat Here' : 'Takeaway'}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-stone-800/80 px-4 py-4 text-center">
            <p className="text-xs md:text-sm text-stone-500 mb-1 font-display uppercase tracking-wide">Payment</p>
            <p className="text-xl md:text-2xl font-bold text-white font-display">
              {paymentMethod === 'CASH' ? 'Cash' : 'QR Pay'}
            </p>
          </div>
        </div>

        <div className="mb-6 w-full space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between rounded-xl bg-stone-800/80 px-5 py-4 md:px-6 md:py-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-xl md:text-2xl font-bold leading-tight text-white">
                    {item.quantity}x {item.displayName}
                  </p>
                  {item.lineType === 'COMBO' ? (
                    <Badge className="bg-bbq-coral font-display text-xs md:text-sm text-white px-2.5 py-0.5">Combo</Badge>
                  ) : null}
                </div>
                {item.choicesSummary ? (
                  <p className="mt-1.5 text-base md:text-lg text-stone-400">{item.choicesSummary}</p>
                ) : null}
                {item.remarks.trim() ? (
                  <p className="mt-1.5 text-base md:text-lg font-semibold text-stone-300">
                    Guest note · {item.remarks.trim()}
                  </p>
                ) : null}
              </div>
              <p className="ml-3 shrink-0 font-display text-xl md:text-2xl font-black tabular-nums text-bbq-coral">
                RM {(item.unitPrice * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="w-full rounded-xl bg-bbq-flame px-6 py-5 md:px-8 md:py-6 flex justify-between items-center mb-8">
          <span className="text-2xl md:text-3xl font-bold text-white font-display">TOTAL</span>
          <span className="text-3xl md:text-4xl font-black text-white font-display tabular-nums">
            RM {cartTotal.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            onClick={() => router.push('/order-menu')}
            variant="outline"
            className="flex-1 rounded-xl py-8 md:py-9 text-lg md:text-xl font-display font-bold border-2 border-stone-600 bg-stone-800 text-stone-200 hover:bg-stone-700"
          >
            Need Changes
          </Button>
          <Button
            onClick={() => router.push('/payment')}
            className="flex-1 rounded-xl py-8 md:py-9 text-lg md:text-xl font-display font-bold bg-bbq-flame hover:bg-bbq-flame/90 text-white"
          >
            Looks Good!
          </Button>
        </div>
      </div>
    </div>
  );
}
