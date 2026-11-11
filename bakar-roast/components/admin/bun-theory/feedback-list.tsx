"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { listFeedback, type AppFeedback } from "@/lib/bun-theory-api";
import { formatOrderTime } from "@/lib/bun-theory";
import { cn } from "@/lib/utils";
import { EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { AdminPage, LoadError } from "@/components/admin/admin-page";
import { useAdminQuery } from "@/components/admin/use-admin-query";

const orderHref = (id: string) => `/admin/bun-theory/orders/${id}`;
const feedbackRef = (f: AppFeedback) => f.order?.slugId ?? (f.orderId ? `${f.orderId.slice(0, 8)}…` : "");

/** Notes customers leave in the storefront's after-checkout feedback popup, newest first. */
export function FeedbackScreen() {
  const list = useAdminQuery(listFeedback, []);
  const busy = list.loading && list.data !== undefined;

  return (
    <AdminPage
      title="Feedback"
      lead="Notes from the feedback popup after checkout."
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
          <div aria-busy="true" className="grid gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )
      ) : (
        <>
          {list.error ? <LoadError onRetry={list.reload} /> : null}
          {!list.data.length ? (
            <EmptyState title="No feedback yet.">Notes show here when customers use the popup after an order.</EmptyState>
          ) : (
            <div aria-busy={busy || undefined} className={cn("transition-opacity", busy && "opacity-70")}>
              <FeedbackCards rows={list.data} />
              <FeedbackTable rows={list.data} />
            </div>
          )}
        </>
      )}
    </AdminPage>
  );
}

function OrderCell({ row }: { row: AppFeedback }) {
  if (!row.orderId) return <span className="text-cream-faint">No order</span>;
  return (
    <span className="grid gap-0.5">
      <Link href={orderHref(row.orderId)} className="inline-flex min-h-11 items-center font-bold tracking-[0.04em] text-cream underline lg:min-h-0">
        {feedbackRef(row)}
      </Link>
      {row.order?.customerName && <span className="text-[13px] text-cream-muted [overflow-wrap:anywhere]">{row.order.customerName}</span>}
    </span>
  );
}

/** Phone and tablet: one card per note. */
function FeedbackCards({ rows }: { rows: AppFeedback[] }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0 lg:hidden">
      {rows.map((row) => (
        <li key={row.id} className="grid gap-3 rounded-card-sm bg-ink-raised p-4">
          <span className="type-admin-meta text-cream-faint">{formatOrderTime(row.createdAt)}</span>
          <p className="m-0 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{row.message}</p>
          <div className="border-t border-ink-line pt-2">
            <OrderCell row={row} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Laptop: date, note and order in columns. */
function FeedbackTable({ rows }: { rows: AppFeedback[] }) {
  return (
    <div className="hidden overflow-hidden rounded-card-sm bg-ink-raised lg:block">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-ink-line">
            <th scope="col" className="type-admin-meta w-[200px] px-4 py-3 font-normal text-cream-faint">
              Date
            </th>
            <th scope="col" className="type-admin-meta px-4 py-3 font-normal text-cream-faint">
              Feedback
            </th>
            <th scope="col" className="type-admin-meta w-[220px] px-4 py-3 font-normal text-cream-faint">
              Order
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-ink-line align-top last:border-b-0">
              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-cream-muted">{formatOrderTime(row.createdAt)}</td>
              <td className="max-w-[70ch] px-4 py-3.5 leading-relaxed">
                <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{row.message}</span>
              </td>
              <td className="px-4 py-3.5 text-sm">
                <OrderCell row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
