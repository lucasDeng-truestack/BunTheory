'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchPublicReceipt } from '@/services/pos-public-receipt.service';
import type { PublicPosReceipt } from '@/types/pos';
import {
  E_RECEIPT_BRAND_BYLINE,
  E_RECEIPT_BRAND_NAME,
  downloadReceiptPdf,
} from '@/lib/e-receipt-pdf';
import { Button } from '@/components/ui/button';

function formatMoney(n: number) {
  return `RM ${n.toFixed(2)}`;
}

function EReceiptInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const isStaffPreview = searchParams.get('preview') === 'staff';
  const [data, setData] = useState<PublicPosReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token?.trim()) {
      setError('Missing receipt link. Ask staff for the QR again.');
      return;
    }

    fetchPublicReceipt(token.trim())
      .then(setData)
      .catch((e) => {
        let msg = e instanceof Error ? e.message : 'Could not load receipt';
        if (msg.includes('Cannot reach API')) {
          msg +=
            ' On a phone or tablet, set NEXT_PUBLIC_API_URL to your backend LAN address (not localhost).';
        }
        setError(msg);
      });
  }, [token]);

  async function handleSavePdf() {
    if (!data || downloading) return;
    setDownloading(true);
    try {
      await downloadReceiptPdf(data);
      toast.success('Receipt downloaded');
    } catch {
      toast.error('Could not generate PDF. Try again.');
    } finally {
      setDownloading(false);
    }
  }

  if (!token?.trim()) {
    return (
      <div className="e-receipt-shell mx-auto max-w-md px-4 py-12 text-center">
        <AlertCircle className="mx-auto h-14 w-14 text-muted-foreground" aria-hidden />
        <p className="font-display mt-4 text-lg font-bold text-foreground">
          Missing receipt token
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="e-receipt-shell mx-auto max-w-md px-4 py-12 text-center space-y-4">
        <AlertCircle className="mx-auto h-14 w-14 text-destructive" aria-hidden />
        <p className="font-display text-lg font-bold text-foreground">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="font-display e-receipt-shell px-4 py-16 text-center text-muted-foreground">
        Loading receipt…
      </div>
    );
  }

  return (
    <div className="e-receipt-shell mx-auto max-w-md px-4 py-6 pb-20">
      {isStaffPreview ? (
        <div className="mb-4 rounded-xl border border-bbq-flame/25 bg-bbq-flame/10 px-4 py-3">
          <p className="font-display text-center text-xs font-bold uppercase tracking-wide text-bbq-flame">
            Staff preview — guest view
          </p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            This is exactly what the customer sees after scanning the QR.
          </p>
          <Link
            href="/order-menu"
            className="font-display mt-3 flex w-full items-center justify-center rounded-lg border border-bbq-flame/30 bg-background px-3 py-2 text-sm font-bold text-bbq-flame transition hover:bg-bbq-flame/5"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" aria-hidden />
            Back to menu
          </Link>
        </div>
      ) : null}

      <div className="e-receipt-toolbar sticky top-0 z-10 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="font-display text-center text-sm font-bold text-muted-foreground sm:text-left">
            {isStaffPreview ? 'Customer e-receipt preview' : 'Your e-receipt'}
          </p>
          <Button
            type="button"
            size="lg"
            className="font-display w-full shrink-0 bg-bbq-flame font-black text-white hover:bg-bbq-flame/90 sm:w-auto sm:min-w-[200px]"
            onClick={handleSavePdf}
            disabled={downloading}
            aria-label="Download receipt as PDF file"
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-2 h-4 w-4" aria-hidden />
            )}
            {downloading ? 'Generating PDF…' : 'Download receipt (PDF)'}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-md text-center text-[11px] leading-snug text-muted-foreground sm:text-left">
          Saves a PDF file to your device — no print dialog.
        </p>
      </div>

      <article className="e-receipt-card rounded-2xl border border-border bg-card p-6 shadow-md ring-1 ring-black/5">
        <p className="font-display text-center text-xs font-bold uppercase tracking-[0.2em] text-bbq-flame">
          {E_RECEIPT_BRAND_NAME}
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {E_RECEIPT_BRAND_BYLINE}
        </p>
        <p className="font-display mt-2 text-center text-xl font-black text-foreground">
          Receipt
        </p>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Order <span className="font-semibold text-foreground">{data.orderNumber}</span>
        </p>
        <p className="text-center font-display text-lg font-bold">{data.customerName}</p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {data.serviceType === 'EAT_HERE' ? 'Eat here' : 'Takeaway'} ·{' '}
          {data.paymentMethod === 'CASH' ? 'Cash' : 'QR Pay'}
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {new Date(data.createdAt).toLocaleString()}
        </p>

        <hr className="my-6 border-border print:border-stone-300" />

        <ul className="space-y-4 text-sm">
          {data.items.map((item, idx) => (
            <li key={`${item.name}-${idx}`} className="flex gap-3 justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-foreground">{item.name}</p>
                {item.choicesSummary ? (
                  <p className="text-xs text-muted-foreground">{item.choicesSummary}</p>
                ) : null}
                <p className="text-muted-foreground tabular-nums">
                  RM {item.unitPrice.toFixed(2)} × {item.quantity}
                </p>
                {item.remarks?.trim() ? (
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-400/95">
                    Note: {item.remarks.trim()}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{formatMoney(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        {data.notes?.trim() ? (
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground print:bg-stone-100">
            {data.notes.trim()}
          </p>
        ) : null}

        <hr className="my-6 border-border print:border-stone-300" />

        <div className="space-y-2 font-display tabular-nums">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMoney(data.subtotal)}</span>
          </div>
          {data.tip > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tip</span>
              <span>{formatMoney(data.tip)}</span>
            </div>
          ) : null}
          <div className="flex justify-between pt-2 text-lg font-black text-bbq-flame">
            <span>Total</span>
            <span>{formatMoney(data.total)}</span>
          </div>
        </div>

        {data.paymentStatus === 'PAID' && data.paidAt ? (
          <p className="mt-6 text-center text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Paid · {new Date(data.paidAt).toLocaleString()}
          </p>
        ) : (
          <p className="mt-6 text-center text-xs font-semibold text-muted-foreground">
            Payment: {data.paymentStatus}
          </p>
        )}
        <p className="font-display mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Thank you — see you soon
        </p>
      </article>
    </div>
  );
}

function EReceiptSuspenseFallback() {
  return (
    <div className="font-display e-receipt-shell min-h-[40vh] flex items-center justify-center text-muted-foreground">
      Opening receipt…
    </div>
  );
}

export default function EReceiptPage() {
  return (
    <div className="e-receipt-shell min-h-screen bg-background">
      <Suspense fallback={<EReceiptSuspenseFallback />}>
        <EReceiptInner />
      </Suspense>
    </div>
  );
}
