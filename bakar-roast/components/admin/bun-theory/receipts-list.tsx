"use client";

import { RefreshCw } from "lucide-react";
import { listOrders } from "@/lib/bun-theory-api";
import { formatRM } from "@/lib/admin";
import { expectedTotalCents, formatOrderTime, orderRef } from "@/lib/bun-theory";
import { cn } from "@/lib/utils";
import { EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { AdminPage, LoadError } from "@/components/admin/admin-page";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { OrderStatusChip, ReceiptPreview } from "@/components/admin/bun-theory/order-parts";

/** Pay now orders with an uploaded receipt, newest first: check each against the amount due. */
export function ReceiptsScreen() {
  const list = useAdminQuery((t) => listOrders(t, { paymentOnly: true, date: "all" }), []);
  const busy = list.loading && list.data !== undefined;

  return (
    <AdminPage
      title="Receipts"
      lead="QR payments to check. Match each receipt to the amount due."
      actions={
        <Button size="sm" variant="ghost" onClick={() => void list.reload()} loading={busy} loadingLabel="Refreshing">
          <span className="inline-flex items-center gap-2">
            <RefreshCw aria-hidden size={16} strokeWidth={1.75} />
            Refresh
          </span>
        </Button>
      }
    >
      {list.data === undefined ? (
        list.error ? (
          <LoadError onRetry={list.reload} />
        ) : (
          <div aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-[360px]" />
            ))}
          </div>
        )
      ) : (
        <>
          {list.error ? <LoadError onRetry={list.reload} /> : null}
          {!list.data.length ? (
            <EmptyState title="No receipts yet.">QR payments with an uploaded receipt show here.</EmptyState>
          ) : (
            <ul
              aria-busy={busy || undefined}
              className={cn("m-0 grid list-none gap-4 p-0 transition-opacity md:grid-cols-2 xl:grid-cols-3", busy && "opacity-70")}
            >
              {list.data.map((o) => (
                <li key={o.id} className="flex flex-col overflow-hidden rounded-card-sm bg-ink-raised">
                  <div className="p-4 pb-0">
                    <ReceiptPreview order={o} />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <b className="block text-base [overflow-wrap:anywhere]">{o.customerName}</b>
                        <span className="text-[13px] text-cream-muted">
                          <span className="font-bold tracking-[0.04em]">{orderRef(o)}</span> · {formatOrderTime(o.createdAt)}
                        </span>
                      </div>
                      <OrderStatusChip status={o.status} className="flex-none" />
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-ink-line pt-3">
                      <div>
                        <span className="type-admin-meta block text-cream-faint">Expected</span>
                        <b className="text-xl tabular-nums text-ember">{formatRM(expectedTotalCents(o))}</b>
                      </div>
                      <Button size="sm" variant="cream" href={`/admin/bun-theory/orders/${o.id}?from=receipts`}>
                        View order
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AdminPage>
  );
}
