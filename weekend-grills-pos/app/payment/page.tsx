'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Banknote, Check, CreditCard, Printer, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { posOrdersService } from '@/services/pos-orders.service';
import { cn } from '@/lib/utils';
import { segmentBundledCart } from '@/lib/cart-bundles';
import { posSettingsService } from '@/services/settings.service';
import type { PosOrderCreated } from '@/types/pos';
import Image from 'next/image';

type CheckoutPhase = 'browse' | 'celebrate' | 'receipt';

function escapeHtml(raw: string) {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Mirrors `app/globals.css` BBQ palette — works in print/PDF previews. */
const RECEIPT_THEME = {
  charcoal: '#1c1917',
  flame: '#ea580c',
  mango: '#f59e0b',
  green: '#16a34a',
  lime: '#84cc16',
  creamPage: '#faf8f5',
  creamWash: '#fff7ed',
  card: '#ffffff',
  border: '#e7e5e4',
  muted: '#78716c',
  accentWash: '#fff7ed',
} as const;

/** Public origin for QR + printed URLs (guests’ phones vs POS host). */
function getReceiptSiteOrigin(): string {
  const trimmed = process.env.NEXT_PUBLIC_POS_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (trimmed && trimmed.length > 0) return trimmed;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

function buildEReceiptAbsoluteUrl(receiptToken: string): string {
  return `${getReceiptSiteOrigin()}/e-receipt?token=${encodeURIComponent(receiptToken)}`;
}

function buildPrintReceiptHtml(
  order: {
    orderNumber: string;
    customerName: string;
    serviceType: string;
    paymentMethod: string;
    subtotal: number;
    createdAt: string;
    paidAt: string | null;
    items: Array<{
      menuItemName: string;
      quantity: number;
      lineTotal: number;
      remarks: string | null;
    }>;
  },
  tipRm: number,
  grand: number,
): string {
  const t = RECEIPT_THEME;

  /** Flex rows (no &lt;table&gt;) — some thermal PDF drivers duplicate &lt;tbody&gt; rows. */
  const lineBlocks = order.items
    .map((oi, idx) => {
      const rk = Number(oi.lineTotal).toFixed(2);
      const zebra =
        idx % 2 === 1 ? `background:${t.creamWash};border-radius:6px` : '';
      const note = oi.remarks?.trim()
        ? `<div class="remark">${escapeHtml(oi.remarks.trim())}</div>`
        : '';
      return `<div class="ln-row"${zebra ? ` style="${zebra}"` : ''}>
  <div class="ln-grow">
    <span class="item-name">${escapeHtml(oi.menuItemName)}</span>${note}
  </div>
  <div class="ln-qty tabular">${oi.quantity}</div>
  <div class="ln-amt tabular">RM ${rk}</div>
</div>`;
    })
    .join('');

  const tipRowHtml =
    tipRm > 0
      ? `<tr><td colspan="2" class="muted" style="font-weight:600">Tip</td><td align="right" class="tabular" style="font-weight:700;color:${t.charcoal}">RM ${tipRm.toFixed(
          2,
        )}</td></tr>`
      : '';

  const svc =
    order.serviceType === 'EAT_HERE' ? 'Eat here' : 'Takeaway';
  const pay = order.paymentMethod === 'CASH' ? 'Cash' : 'QR Pay';

  const printedAtLbl = escapeHtml(
    new Date().toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  );
  const orderPlacedLbl = escapeHtml(
    new Date(order.createdAt).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  );
  const paidAtLbl = order.paidAt
    ? escapeHtml(
        new Date(order.paidAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      )
    : '';

  const subFmt = escapeHtml(Number(order.subtotal).toFixed(2));
  const grandFmt = escapeHtml(grand.toFixed(2));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(order.orderNumber)}</title>
<style>
 @page { margin: 10mm 12mm; }
 * { box-sizing: border-box; }
 html, body { margin: 0; padding: 0; }
 body {
   background: ${t.creamPage};
   color: ${t.charcoal};
   padding: 16px;
   font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
   font-size: 12px;
   line-height: 1.38;
   -webkit-print-color-adjust: exact !important;
   print-color-adjust: exact !important;
 }
 .shell { max-width: 348px; margin: 0 auto; }
 .card {
   background: ${t.card};
   border: 2px solid ${t.border};
   border-radius: 18px;
   overflow: hidden;
   box-shadow: 0 2px 14px rgba(28,25,23,0.08);
 }
 .flame-strip {
   height: 10px;
   background: linear-gradient(90deg, ${t.flame} 0%, ${t.mango} 52%, ${t.lime} 100%);
 }
 .banner {
   padding: 14px 16px 12px;
   text-align: center;
   background:
     radial-gradient(ellipse 130% 100% at 50% -15%, rgba(254,243,199,0.75) 0%, transparent 50%),
     ${t.accentWash};
   border-bottom: 2px dashed ${t.border};
 }
 .display { font-family: "Comic Sans MS", "Comic Sans", "Chalkboard SE", "Marker Felt", cursive; }
 .brand {
   margin: 0;
   font-size: 24px;
   font-weight: 900;
   color: ${t.flame};
   letter-spacing: 0.02em;
 }
 .ribbon {
   margin: 6px 0 0;
   font-family: inherit;
   font-size: 8px;
   font-weight: 800;
   letter-spacing: 0.32em;
   text-transform: uppercase;
   color: ${t.muted};
 }
 .order-chip {
   display: inline-block;
   margin-top: 14px;
   padding: 6px 14px;
   border-radius: 999px;
   border: 2px solid ${t.border};
   background: ${t.card};
   font-family: ui-monospace, "SF Mono", Consolas, monospace;
   font-size: 13px;
   font-weight: 900;
 }
 .guest { padding: 14px 18px 0; }
 .guest-name {
   margin: 0;
   font-family: ui-sans-serif, system-ui, sans-serif;
   font-size: 17px;
   font-weight: 800;
 }
 .pills {
   margin: 10px 0 0;
   display: flex;
   flex-wrap: wrap;
   gap: 8px;
 }
 .pill {
   display: inline-block;
   padding: 4px 10px;
   border-radius: 999px;
   font-size: 10px;
   font-weight: 800;
   letter-spacing: 0.06em;
   text-transform: uppercase;
 }
 .pill-deep { background: ${t.charcoal}; color: #fefcf8; }
 .pill-accent {
   background: ${t.accentWash};
   color: ${t.flame};
   border: 1px solid rgba(234,88,12,0.35);
 }
 .when {
   margin: 12px 18px 0;
   padding: 10px 0 0;
   border-top: 1px solid ${t.border};
   font-size: 11px;
   font-weight: 700;
   color: ${t.muted};
   line-height: 1.5;
 }
 .when strong {
   font-weight: 900;
   color: ${t.charcoal};
 }
 .meta-block {
   margin: 8px 18px 0;
   padding: 0 0 10px;
   font-size: 10px;
   font-weight: 700;
   color: ${t.muted};
   line-height: 1.65;
 }
 .meta-block strong { color: ${t.charcoal}; font-weight: 900; }
 .lines-wrap { padding: 14px 14px 4px; }
 .lines-head {
   display: flex;
   align-items: flex-end;
   gap: 8px;
   padding: 9px 6px 11px;
   font-family: "Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive;
   font-size: 9px;
   letter-spacing: 0.07em;
   text-transform: uppercase;
   font-weight: 900;
   color: ${t.charcoal};
   background: rgba(234,88,12,0.12);
   border-radius: 6px;
   margin-bottom: 8px;
   border-bottom: 2px solid rgba(234,88,12,0.35);
 }
 .ln-h-item { flex: 1 1 auto; min-width: 0; text-align: left; }
 .ln-h-qty { flex: 0 0 40px; text-align: right; }
 .ln-h-amt { flex: 0 0 92px; text-align: right; }
 .lines-body .ln-row:last-child {
   border-bottom: none;
 }
 .ln-row {
   display: flex;
   gap: 8px;
   align-items: flex-start;
   padding: 9px 6px;
   border-bottom: 1px solid ${t.border};
   font-size: 12px;
   break-inside: avoid-page;
 }
 .ln-grow {
   flex: 1 1 auto;
   min-width: 0;
   font-weight: 600;
 }
 .ln-qty {
   flex: 0 0 40px;
   text-align: right;
   font-weight: 800;
   font-variant-numeric: tabular-nums;
 }
 .ln-amt {
   flex: 0 0 92px;
   text-align: right;
   font-weight: 800;
   font-variant-numeric: tabular-nums;
 }
 .tabular { font-variant-numeric: tabular-nums slashed-zero; }
 .muted { color: ${t.muted}; }
 .remark {
   margin-top: 5px;
   font-size: 10px;
   font-weight: 700;
   color: ${t.mango};
 }
 .sums {
   margin: 8px 16px 0;
   padding-top: 10px;
   border-top: 3px solid ${t.flame};
 }
 .sum-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
 .sum-table td { padding: 4px 0; }
 .total-label {
   padding-top: 12px !important;
   font-family: "Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive;
   font-size: 17px;
   font-weight: 900;
 }
 .total-amt::before {
   content: "RM ";
   font-size: 12px;
   font-weight: 800;
   color: ${t.muted};
 }
 .total-amt {
   padding-top: 12px !important;
   text-align: right;
   font-family: "Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive;
   font-size: 21px;
   font-weight: 900;
   color: ${t.flame};
 }
 .foot {
   text-align: center;
   padding: 18px 16px 20px;
   background: linear-gradient(180deg, #fffefb 0%, #fef9f2 100%);
 }
 .thank {
   margin: 0;
   font-family: "Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive;
   font-size: 18px;
   font-weight: 900;
   color: ${t.green};
 }
 .line {
   margin: 10px auto;
   height: 3px;
   width: 92px;
   border-radius: 999px;
   background: linear-gradient(90deg, transparent, ${t.lime}, ${t.green}, transparent);
 }
 .micro {
   margin: 10px 0 0;
   font-size: 9px;
   font-weight: 700;
   letter-spacing: 0.06em;
   text-transform: uppercase;
   color: ${t.muted};
 }
 @media print {
   body { padding: 0; background: #fff !important; }
   .shell { max-width: 100%; }
   .card {
     border: none;
     border-radius: 0;
     box-shadow: none;
   }
 }
</style>
</head>
<body>
  <div class="shell">
    <div class="card">
      <div class="flame-strip" aria-hidden="true"></div>
      <div class="banner">
        <h1 class="brand display">${escapeHtml('Weekend Grills')}</h1>
        <p class="ribbon">Barbeque &amp; Tropical plates</p>
        <span class="order-chip">${escapeHtml(order.orderNumber)}</span>
      </div>
      <div class="guest">
        <p class="guest-name">${escapeHtml(order.customerName)}</p>
        <div class="pills">
          <span class="pill pill-deep">${escapeHtml(svc)}</span>
          <span class="pill pill-accent">${escapeHtml(pay)}</span>
        </div>
      </div>
      <p class="when"><strong>Printed</strong> · ${printedAtLbl}</p>
      <div class="meta-block">
        <div><strong>Order placed</strong> · ${orderPlacedLbl}</div>
        ${
          paidAtLbl.length > 0
            ? `<div><strong>Paid</strong> · ${paidAtLbl}</div>`
            : ''
        }
      </div>
      <div class="lines-wrap">
        <div class="lines-head">
          <span class="ln-h-item">Item</span>
          <span class="ln-h-qty">Qty</span>
          <span class="ln-h-amt">Amt</span>
        </div>
        <div class="lines-body">${lineBlocks}</div>
      </div>
      <div class="sums">
        <table class="sum-table"><tbody>
          <tr>
            <td class="muted" colspan="2" style="font-weight:700;font-size:12px;">Subtotal</td>
            <td align="right" style="font-weight:800">RM ${subFmt}</td>
          </tr>
          ${tipRowHtml}
          <tr>
            <td class="total-label display" colspan="2">Total</td>
            <td class="total-amt tabular">${grandFmt}</td>
          </tr>
        </tbody></table>
      </div>
      <div class="foot">
        <p class="thank">${escapeHtml('Thank you — see you soon!')}</p>
        <div class="line" aria-hidden="true"></div>
        <p class="micro">POS receipt · Tropical vibe barbeque</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default function PaymentPage() {
  const router = useRouter();
  const { isAuthenticated, hydrated, hydrate } = useAuthStore();
  const {
    items,
    customerName,
    serviceType,
    paymentMethod,
    setPaymentMethod,
    total,
    removeItem,
    removeMealBundle,
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
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace('/login');
  }, [hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    void posSettingsService
      .getSettings()
      .then((s) => {
        const u = s.paymentQrUrl?.trim();
        setPaymentQrUrl(u && u.length > 0 ? u : null);
      })
      .catch(() => setPaymentQrUrl(null));
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (checkoutPhase !== 'browse') return;
    if (items.length === 0) router.replace('/order-menu');
  }, [checkoutPhase, items.length, router]);

  const segments = segmentBundledCart(items);

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

  function printPaperReceipt(snapshot: {
    order: PosOrderCreated;
    grandTotal: number;
  }) {
    const { order, grandTotal: grand } = snapshot;
    const html = buildPrintReceiptHtml(
      {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        serviceType: order.serviceType,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        items: order.items.map((oi) => ({
          menuItemName: oi.menuItemName,
          quantity: oi.quantity,
          lineTotal: oi.lineTotal,
          remarks: oi.remarks,
        })),
      },
      0,
      grand,
    );

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', `Print receipt ${order.orderNumber}`);
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
      visibility: 'hidden',
    });

    const cleanup = () => {
      iframe.contentWindow?.removeEventListener('afterprint', cleanup);
      iframe.parentNode?.removeChild(iframe);
    };

    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) {
      cleanup();
      toast.error('Printing is not available in this environment.');
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    win.addEventListener('afterprint', cleanup);

    const runPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
        toast.error('Could not open the print dialog.');
        return;
      }
      /** If afterprint never fires (some browsers), still remove the iframe. */
      setTimeout(() => {
        if (iframe.parentNode) cleanup();
      }, 90_000);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(runPrint);
    });
  }

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
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          remarks: i.remarks.trim() || undefined,
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
                  {segments.flatMap((seg, segIdx) => {
                    if (seg.type === 'single') {
                      const item = seg.item;
                      return [
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{item.name}</p>
                            {item.remarks.trim() ? (
                              <p className="mt-1 text-[11px] font-medium text-amber-900/90 dark:text-amber-500/95">
                                Note: {item.remarks.trim()}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">RM {item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center tabular-nums font-semibold">{item.quantity}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold">RM {(item.unitPrice * item.quantity).toFixed(2)}</td>
                          <td className="px-2 py-3">
                            <Button variant="ghost" size="icon-xs" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                            </Button>
                          </td>
                        </tr>,
                      ];
                    }
                    const headKey = `${seg.bundleId}-head-${segIdx}`;
                    const bundleRows = seg.lines.map((item) => (
                      <tr key={item.id} className="bg-accent/35">
                        <td className="px-4 py-2 pl-8">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          {item.mealLineKind === 'MAIN' ? (
                            <Badge className="mt-1 mr-2 bg-bbq-flame font-display text-[10px] text-white">Main</Badge>
                          ) : null}
                          {item.mealLineKind === 'SIDE' ? (
                            <Badge variant="secondary" className="mt-1 mr-2 font-display text-[10px]">Side</Badge>
                          ) : null}
                          {item.mealLineKind === 'DRINK_ADDON' ? (
                            <Badge variant="secondary" className="mt-1 mr-2 font-display text-[10px]">Drink</Badge>
                          ) : null}
                          {item.remarks.trim() ? (
                            <p className="mt-1 text-[11px] font-medium text-amber-900/90 dark:text-amber-500/95">
                              Note: {item.remarks.trim()}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">RM {item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center tabular-nums font-semibold">{item.quantity}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold">RM {(item.unitPrice * item.quantity).toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <Button variant="ghost" size="icon-xs" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                          </Button>
                        </td>
                      </tr>
                    ));
                    return [
                      <tr key={headKey} className="border-b border-bbq-flame/25 bg-accent/55">
                        <td colSpan={5} className="px-4 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-xs font-black uppercase tracking-wide text-foreground">
                              Meal · {seg.title}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-destructive/40 font-display text-[11px] text-destructive"
                              onClick={() => removeMealBundle(seg.bundleId)}
                            >
                              Remove meal
                            </Button>
                          </div>
                        </td>
                      </tr>,
                      ...bundleRows,
                    ];
                  })}
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
                  onClick={() => printPaperReceipt(lastReceipt)}
                >
                  <Printer className="mr-2 h-4 w-4" aria-hidden />
                  Print receipt
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
