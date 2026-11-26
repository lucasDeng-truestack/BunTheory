"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getOrder, type Order } from "@/lib/bun-theory-api";
import { firstName, formatRM, waNumber } from "@/lib/admin";
import {
  ALL_ORDER_STATUSES,
  formatOrderTime,
  moneyBreakdown,
  orderRef,
  orderWaMessage,
  paymentChoiceLabel,
} from "@/lib/bun-theory";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { useAdminTopBar } from "@/components/admin/admin-context";
import { ADMIN_TITLE, AdminActionBar, LoadError } from "@/components/admin/admin-page";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import {
  Block,
  OrderLines,
  OrderStatusChip,
  OrderStatusSelect,
  ReceiptLabel,
  ReceiptPreview,
  useOrderStatus,
} from "@/components/admin/bun-theory/order-parts";

/** Back goes to the receipts or the filtered orders list the owner came from. */
function useBack() {
  const params = useSearchParams();
  if (params.get("from") === "receipts") return { href: "/admin/bun-theory/receipts", label: "Receipts" };
  const qs = params.toString();
  return { href: `/admin/bun-theory/orders${qs ? `?${qs}` : ""}`, label: "All orders" };
}

export function OrderDetailScreen({ id }: { id: string }) {
  const back = useBack();
  const q = useAdminQuery((t) => getOrder(t, id), [id]);
  const notFound = q.error instanceof ApiError && q.error.status === 404;
  useAdminTopBar({ title: q.data && !notFound ? `Order ${orderRef(q.data)}` : "Order", back: back.href });

  if (notFound) {
    return (
      <div className="grid animate-fade-in gap-5">
        <h1 className={cn(ADMIN_TITLE, "max-lg:sr-only")}>Order</h1>
        <EmptyState
          title="We could not find that order."
          action={
            <Button size="sm" variant="cream" href={back.href}>
              {back.label}
            </Button>
          }
        >
          The link may be old or mistyped.
        </EmptyState>
      </div>
    );
  }
  if (q.data === undefined) return q.error ? <LoadError onRetry={q.reload} /> : <DetailSkeleton />;
  return <OrderDetailView order={q.data} back={back} onUpdated={(o) => q.setData(o)} />;
}

function OrderDetailView({
  order: o,
  back,
  onUpdated,
}: {
  order: Order;
  back: { href: string; label: string };
  onUpdated: (o: Order) => void;
}) {
  const status = useOrderStatus();
  const ref = orderRef(o);
  const money = moneyBreakdown(o);
  const tel = `tel:${o.phone.replace(/\s/g, "")}`;
  const wa = `https://wa.me/${waNumber(o.phone)}?text=${encodeURIComponent(orderWaMessage(firstName(o.customerName), ref))}`;
  const address = o.deliveryAddress?.trim();
  const notes = o.deliveryNotes?.trim();
  const batch = o.batch?.label?.trim();

  return (
    <div className="grid animate-fade-in content-start gap-5">
      <Link
        href={back.href}
        className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-cream-muted no-underline hover:text-cream max-lg:hidden"
      >
        <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
        {back.label}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className={cn(ADMIN_TITLE, "max-lg:text-[30px] [overflow-wrap:anywhere]")}>{o.customerName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="font-bold tracking-[0.04em]">Order {ref}</span>
            <OrderStatusChip status={o.status} />
            <span className="text-cream-muted">{formatOrderTime(o.createdAt)}</span>
          </div>
        </div>
        <OrderStatusSelect
          order={o}
          options={ALL_ORDER_STATUSES}
          saving={status.savingId === o.id}
          onChange={async (s) => {
            const updated = await status.change(o, s);
            if (updated) onUpdated(updated);
          }}
          label="Status"
          className="w-full sm:w-[220px]"
        />
      </div>

      {status.notice && (
        <Banner tone={status.notice.tone} title={status.notice.title}>
          {status.notice.help}
        </Banner>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-4">
          <Block title="Line items">
            <OrderLines order={o} prices />
            {money.totalCents !== null && (
              <dl className="m-0 grid border-t-2 border-ink-line pt-2.5">
                {money.rows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-3 py-1 text-cream-muted">
                    <dt>{r.label}</dt>
                    <dd className="m-0 tabular-nums">{formatRM(r.cents)}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 pt-1.5">
                  <dt className="text-lg font-bold">Total</dt>
                  <dd className="m-0 text-lg font-bold tabular-nums text-ember">{formatRM(money.totalCents)}</dd>
                </div>
                {money.taxCents !== null && (
                  <div className="flex justify-between gap-3 text-[13px] text-cream-muted">
                    <dt>Includes tax</dt>
                    <dd className="m-0 tabular-nums">{formatRM(money.taxCents)}</dd>
                  </div>
                )}
              </dl>
            )}
          </Block>

          <Block title="Customer">
            <p className="m-0 [overflow-wrap:anywhere]">
              <b>{o.customerName}</b>
              <br />
              <span className="select-all">{o.phone}</span>
            </p>
            <div className="flex flex-wrap gap-2 max-lg:hidden">
              <Button size="sm" variant="cream" href={tel}>
                Call
              </Button>
              <Button size="sm" variant="ghost" href={wa} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </Button>
            </div>
          </Block>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <Block title="Fulfillment">
            <p className="m-0 font-semibold">
              {o.type === "DELIVERY" ? "Delivery" : "Pickup"}
              {batch ? <span className="font-normal text-cream-muted"> · {batch}</span> : null}
            </p>
            {o.type === "DELIVERY" &&
              (address || notes ? (
                <div className="grid gap-2 rounded-[12px] bg-ink px-3.5 py-3">
                  {address && <p className="m-0 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{address}</p>}
                  {notes && (
                    <p className="m-0 text-cream-muted [overflow-wrap:anywhere]">
                      <b className="font-semibold text-cream">Notes:</b> {notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="m-0 text-cream-muted">No delivery address on this order. It was placed before checkout asked for one.</p>
              ))}
          </Block>

          <Block title="Payment">
            <dl className="m-0 grid">
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 pb-2">
                <dt className="text-cream-muted">Method</dt>
                <dd className="m-0 font-semibold">{paymentChoiceLabel(o)}</dd>
              </div>
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-ink-line pt-2">
                <dt className="text-cream-muted">Receipt</dt>
                <dd className="m-0">
                  <ReceiptLabel order={o} />
                </dd>
              </div>
            </dl>
            {o.paymentChoice === "PAY_NOW" &&
              (o.paymentReceiptUrl?.trim() ? (
                <ReceiptPreview order={o} pdfFrame />
              ) : (
                <p className="m-0 rounded-card-sm border border-dashed border-cream-faint px-4 py-6 text-center text-cream-muted">
                  No receipt yet. The customer chose Pay now and can upload one from checkout.
                </p>
              ))}
          </Block>
        </div>
      </div>

      <AdminActionBar>
        <Button size="sm" variant="cream" href={tel} className="h-[52px] flex-1 px-3">
          Call
        </Button>
        <Button size="sm" variant="ghost" href={wa} target="_blank" rel="noopener noreferrer" className="h-[52px] flex-1 px-3">
          WhatsApp
        </Button>
      </AdminActionBar>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5">
      <div className="grid gap-2">
        <Skeleton className="h-10 w-2/3 max-w-sm" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
