'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Eye, Loader2, Banknote, Check, CreditCard, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/cart.store';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { posOrdersService } from '@/services/pos-orders.service';
import { cn } from '@/lib/utils';
import { posSettingsService } from '@/services/settings.service';
import type { PosOrderCreated } from '@/types/pos';
import Image from 'next/image';
import {
  buildEReceiptAbsoluteUrl,
  buildEReceiptPath,
} from '@/lib/e-receipt-url';

type CheckoutPhase = 'browse' | 'celebrate' | 'receipt';


export default function PaymentPage() {
  const router = useRouter();
  const { ready } = useStaffAuth();
  const {
    items,
    customerName,
    serviceType,
    paymentMethod,
    setPaymentMethod,
    total,
    removeItem,
    clearCart,
  } = useCartStore();
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>('browse');
  const [lastReceipt, setLastReceipt] = useState<{
    order: PosOrderCreated;
    grandTotal: number;
  } | null>(null);
  /** Payment QR from Settings · shown when guest pays by QR */
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null);
  const cartTotal = total();
  const grandTotal = cartTotal;

  useEffect(() => {
    if (!ready) return;
    void posSettingsService
      .getSettings()
      .then((s) => {
        const u = s.paymentQrUrl?.trim();
        setPaymentQrUrl(u && u.length > 0 ? u : null);
      })
      .catch(() => setPaymentQrUrl(null));
  }, [ready]);

  useEffect(() => {
    return () => {
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (checkoutPhase !== 'browse') return;
    if (items.length === 0) router.replace('/order-menu');
  }, [checkoutPhase, items.length, router]);

  const cashParsed =
    paymentMethod !== 'CASH'
      ? 0
      : Number.parseFloat(String(cashReceived).replace(',', '.'));
  const cashSufficient =
    paymentMethod !== 'CASH' ||
    (Number.isFinite(cashParsed) && cashParsed + 1e-6 >= grandTotal);

  /** Tender minus payable total, when Cash and over-paid. */
  const cashChangeAmount =
    paymentMethod === 'CASH' &&
    Number.isFinite(cashParsed) &&
    cashParsed > grandTotal + 1e-6
      ? Math.round((cashParsed - grandTotal) * 100) / 100
      : null;

  function openCustomerReceipt(receiptToken: string) {
    const token = receiptToken.trim();
    if (!token) {
      toast.error('E-receipt link is not available for this order.');
      return;
    }
    router.push(buildEReceiptPath(token, { staffPreview: true }));
  }

  if (!ready) return null;

  if (checkoutPhase === 'browse' && items.length === 0) {
    return null;
  }

  if (checkoutPhase !== 'browse' && !lastReceipt) {
    return null;
  }

  async function handlePayNow() {
    if (!cashSufficient) {
      toast.error('Cash received is less than the total.');
      return;
    }
    setLoading(true);
    try {
      const created = await posOrdersService.create({
        customerName: customerName.trim(),
        serviceType,
        paymentMethod,
        items: items.map((i) => ({
          lineType: i.lineType,
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          remarks: i.remarks.trim() || undefined,
          comboSelections: i.comboSelections,
        })),
      });
      const paid = await posOrdersService.updatePayment(created.id, 'PAID');

      const grandRounded = Math.round(paid.total * 100) / 100;
      clearCart();

      const receiptToken =
        paid.receiptToken?.trim() || created.receiptToken?.trim() || '';

      toast.success('Payment recorded.');
      if (!receiptToken) {
        toast.warning(
          'E-receipt QR is unavailable until the receipt token API is active — restart backend after update.',
          { duration: 8000 },
        );
      }

      const orderForQr: PosOrderCreated = {
        ...paid,
        receiptToken,
      };

      const snapshot = {
        order: orderForQr,
        grandTotal: grandRounded,
      } as const;

      if (orderForQr.receiptToken.split('.').length !== 2) {
        console.warn(
          'Unexpected receipt token shape; expected "<payload>.<signature>" — guest QR may not work.',
        );
      }

      setLastReceipt(snapshot);
      celebrateTimerRef.current = setTimeout(() => {
        setCheckoutPhase('receipt');
        celebrateTimerRef.current = null;
      }, 1400);
      setCheckoutPhase('celebrate');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background relative">
      {checkoutPhase === 'browse' ? (
        <>
          {/* Staff top bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Badge variant="secondary" className="ml-auto font-display">
              Step 3 · Payment
            </Badge>
          </div>

          <div className="flex flex-col lg:flex-row max-w-5xl mx-auto p-4 md:p-6 gap-6">
        {/* Left: order summary table */}
        <div className="flex-1 space-y-4">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-xl font-bold text-foreground">
              ORDER #: {customerName || '—'}
            </h1>
            <Badge variant={serviceType === 'EAT_HERE' ? 'secondary' : 'outline'}>
              {serviceType === 'EAT_HERE' ? 'Eat Here' : 'Takeaway'}
            </Badge>
          </div>

          {/* Items table */}
          <Card>
            <CardContent className="p-0!">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-display font-bold text-muted-foreground text-xs uppercase tracking-wide">Item</th>
                    <th className="text-right px-4 py-2.5 font-display font-bold text-muted-foreground text-xs uppercase tracking-wide">Price</th>
                    <th className="text-center px-4 py-2.5 font-display font-bold text-muted-foreground text-xs uppercase tracking-wide">Qty</th>
                    <th className="text-right px-4 py-2.5 font-display font-bold text-muted-foreground text-xs uppercase tracking-wide">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{item.displayName}</p>
                        {item.choicesSummary ? (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.choicesSummary}</p>
                        ) : null}
                        {item.remarks.trim() ? (
                          <p className="mt-1 text-[11px] font-medium text-amber-900/90 dark:text-amber-500/95">
                            Note: {item.remarks.trim()}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        RM {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold">{item.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        RM {(item.unitPrice * item.quantity).toFixed(2)}
                      </td>
                      <td className="px-2 py-3">
                        <Button variant="ghost" size="icon-xs" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Button
            variant="destructive"
            onClick={() => { clearCart(); router.replace('/order-menu'); }}
            className="w-full rounded-xl py-5 font-display"
          >
            Cancel Order
          </Button>
        </div>

        {/* Right: payable amount panel */}
        <div className="w-full lg:w-80 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Payable Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-display font-black text-bbq-flame tabular-nums">RM {cartTotal.toFixed(2)}</p>

              <p className="text-xs text-muted-foreground">Guests: {customerName || '—'}</p>

              {/* Payment method */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 rounded-lg py-3 border-2 transition',
                    paymentMethod === 'CASH'
                      ? 'border-bbq-flame bg-accent text-bbq-flame'
                      : 'border-border text-muted-foreground hover:border-bbq-flame/30',
                  )}
                >
                  <Banknote className="h-5 w-5" />
                  <span className="text-xs font-display font-bold">Cash</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('QR')}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 rounded-lg py-3 border-2 transition',
                    paymentMethod === 'QR'
                      ? 'border-bbq-flame bg-accent text-bbq-flame'
                      : 'border-border text-muted-foreground hover:border-bbq-flame/30',
                  )}
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs font-display font-bold">QR Pay</span>
                </button>
              </div>

              {/* Cash received */}
              {paymentMethod === 'CASH' && (
                <div>
                  <p className="text-xs font-display font-bold text-muted-foreground mb-1 uppercase tracking-wide">Cash Received</p>
                  <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground text-sm">RM</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="flex-1 bg-transparent text-xl font-display font-bold text-foreground focus:outline-none tabular-nums"
                      placeholder={grandTotal.toFixed(0)}
                      aria-label={`Cash received — total RM ${grandTotal.toFixed(2)}`}
                    />
                  </div>
                </div>
              )}

              {/* Saved transfer QR from Settings */}
              {paymentMethod === 'QR' && (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                  {paymentQrUrl ? (
                    <>
                      <p className="text-xs font-display font-bold uppercase tracking-wide text-muted-foreground">
                        Scan to pay
                      </p>
                      <div className="relative mx-auto aspect-square w-full max-w-52 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                        <Image
                          src={paymentQrUrl}
                          alt="Transfer QR code — scan with banking app"
                          fill
                          className="object-contain p-2"
                          sizes="208px"
                          unoptimized
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-xs leading-relaxed text-muted-foreground">
                      No payment QR uploaded. Add one under{' '}
                      <Link
                        href="/settings"
                        className="font-semibold text-bbq-flame underline-offset-4 hover:underline"
                      >
                        Settings → Payment QR
                      </Link>
                      .
                    </p>
                  )}
                  <p className="font-display text-[10px] text-muted-foreground">
                    Guest scans and confirms payment
                  </p>
                </div>
              )}

              {/* Totals summary */}
              <Separator />
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">RM {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-display font-black pt-1">
                  <span>TOTAL</span>
                  <span className="text-bbq-flame tabular-nums">RM {grandTotal.toFixed(2)}</span>
                </div>
                {paymentMethod === 'CASH' && cashChangeAmount != null && cashChangeAmount > 0 ? (
                  <div className="flex justify-between text-base font-display font-black pt-2 text-emerald-700 dark:text-emerald-400">
                    <span>Change</span>
                    <span className="tabular-nums">RM {cashChangeAmount.toFixed(2)}</span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handlePayNow}
            disabled={loading || !cashSufficient}
            className="w-full rounded-xl py-6 text-base font-display font-black bg-bbq-coral hover:bg-bbq-coral/90 text-white"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'PAID'
            )}
          </Button>
        </div>
      </div>
        </>
      ) : (
        <div className="min-h-[32vh]" aria-hidden />
      )}

      {checkoutPhase === 'celebrate' && lastReceipt && (
        <div
          className="fixed inset-0 z-200 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-md"
          role="status"
          aria-live="polite"
        >
          <div className="flex h-28 w-28 animate-in zoom-in duration-300 items-center justify-center rounded-full bg-emerald-500/20 shadow-inner ring-4 ring-emerald-500/30">
            <Check
              className="h-16 w-16 text-emerald-600 animate-in fade-in zoom-in duration-400"
              aria-hidden
              strokeWidth={2.75}
            />
          </div>
          <div className="text-center px-6">
            <p className="font-display text-2xl font-black text-foreground">Paid</p>
            <p className="font-display mt-2 text-sm text-muted-foreground">
              {lastReceipt.order.orderNumber} · RM {lastReceipt.grandTotal.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {checkoutPhase === 'receipt' && lastReceipt && (
        <div className="fixed inset-0 z-200 flex items-center justify-center overflow-y-auto bg-background/96 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-xl border-border">
            <CardHeader className="text-center space-y-1">
              <CardTitle className="font-display text-xl">Receipt ready</CardTitle>
              <p className="text-sm text-muted-foreground font-display font-semibold">
                {lastReceipt.order.orderNumber}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <p className="text-center font-display text-sm text-muted-foreground">
                Scan this QR code for digital e-receipt
              </p>
              <div className="rounded-2xl border border-border bg-white p-4 shadow-inner">
                <QRCodeSVG
                  value={buildEReceiptAbsoluteUrl(lastReceipt.order.receiptToken)}
                  size={192}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 font-display font-bold py-6"
                  onClick={() => openCustomerReceipt(lastReceipt.order.receiptToken)}
                >
                  <Eye className="mr-2 h-4 w-4" aria-hidden />
                  View customer receipt
                </Button>
                <Button
                  type="button"
                  className="flex-1 font-display font-black py-6 bg-bbq-flame hover:bg-bbq-flame/90 text-white"
                  onClick={() => router.push('/order-menu')}
                >
                  Back to menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
