"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { canOrder, listOrders, type CanOrderResponse, type Order } from "@/lib/bun-theory-api";
import { formatRM } from "@/lib/admin";
import {
  averageCents,
  countByStatus,
  formatBatchLabel,
  formatRelativeShort,
  loadPercent,
  ORDER_DATES,
  orderLineCents,
  orderRef,
  revenueBuckets,
  revenueCents,
  topItems,
  uniqueCustomers,
  type OrderDate,
  type RevenueBucket,
} from "@/lib/bun-theory";
import { klToday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { AdminPage, LoadError } from "@/components/admin/admin-page";
import { Tile } from "@/components/admin/tile";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Block, OrderStatusChip } from "@/components/admin/bun-theory/order-parts";

const ORDERS = "/admin/bun-theory/orders";
const ordersFor = (range: OrderDate) => (range === "week" ? ORDERS : `${ORDERS}?date=${range}`);
const rangeLabel = (range: OrderDate) => ORDER_DATES.find((d) => d.value === range)?.label ?? "";

/** The Bun Theory at a glance: orders in a time range, revenue, best sellers and the open batch's load. */
export function OverviewScreen() {
  const [range, setRange] = useState<OrderDate>("week");
  const q = useAdminQuery((t) => Promise.all([canOrder(), listOrders(t, { date: range })]), [range]);
  const busy = q.loading && q.data !== undefined;

  return (
    <AdminPage
      title="The Bun Theory"
      lead="Your kitchen at a glance. The numbers follow the time range."
      actions={
        <>
          <Button size="sm" variant="cream" href={ordersFor(range)}>
            All orders
          </Button>
          <Button size="sm" variant="ghost" href="/admin/bun-theory/settings">
            Settings
          </Button>
        </>
      }
    >
      <div role="group" aria-label="Time range" className="flex flex-wrap gap-2">
        {ORDER_DATES.map((d) => (
          <Pill key={d.value} selected={range === d.value} onClick={() => setRange(d.value)}>
            {d.label}
          </Pill>
        ))}
      </div>
      {q.data === undefined ? (
        q.error ? (
          <LoadError onRetry={q.reload} />
        ) : (
          <OverviewSkeleton />
        )
      ) : (
        <>
          {q.error ? <LoadError onRetry={q.reload} /> : null}
          <div aria-busy={busy || undefined} className={cn("grid gap-5 transition-opacity", busy && "opacity-70")}>
            <OverviewView ctx={q.data[0]} orders={q.data[1]} range={range} />
          </div>
        </>
      )}
    </AdminPage>
  );
}

/** The overview from data. Pure props. */
export function OverviewView({ ctx, orders, range }: { ctx: CanOrderResponse; orders: Order[]; range: OrderDate }) {
  const received = countByStatus(orders, "RECEIVED");
  const preparing = countByStatus(orders, "PREPARING");
  // Cancelled orders are not sales: leave them out of money, counts and top items.
  const sales = orders.filter((o) => o.status !== "CANCELLED");
  const revenue = revenueCents(sales);
  const pct = loadPercent(ctx.current, ctx.max);
  const batchLabel = formatBatchLabel(ctx);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile label="Pending orders" value={received} sub="Received, waiting for prep" hot={received > 0} href={ordersFor(range)} />
        <Tile label="In progress" value={preparing} sub="Preparing now" href={ordersFor(range)} />
        <div className="col-span-2 lg:col-span-1 [&>a]:h-full">
          <Tile
            label="Batch capacity"
            value={`${ctx.current} / ${ctx.max}`}
            sub={ctx.max > 0 ? `${pct}% of the batch limit` : batchLabel ?? "No batch open"}
            href="/admin/bun-theory/batches"
          />
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <RevenueChart buckets={revenueBuckets(sales, range, klToday())} totalCents={revenue} />
        </div>
        <Block title="Business snapshot">
          <p className="m-0 text-[13px] text-cream-muted">Orders in {rangeLabel(range).toLowerCase()}.</p>
          <dl className="m-0 grid gap-2">
            <Snapshot label="Unique customers" value={uniqueCustomers(sales)} />
            <Snapshot label="Total orders" value={sales.length} />
            <Snapshot label="Average order" value={formatRM(averageCents(revenue, sales.length))} />
          </dl>
        </Block>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <RecentActivity orders={orders} range={range} />
        <TopItems orders={sales} range={range} />
      </div>

      <KitchenLoad ctx={ctx} label={batchLabel} pct={pct} />
    </>
  );
}

function Snapshot({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-card-sm bg-ink px-4 py-3">
      <dt className="text-sm text-cream-muted">{label}</dt>
      <dd className="m-0 font-display text-[32px] font-extrabold leading-none tabular-nums [font-stretch:80%]">{value}</dd>
    </div>
  );
}

/**
 * Bars drawn with CSS, as the old dashboard. The bars are decoration for sighted users; the amounts
 * are in a table under "Show amounts" (and a one-line summary), so phone and screen readers get them.
 */
function RevenueChart({ buckets, totalCents }: { buckets: RevenueBucket[]; totalCents: number }) {
  const max = Math.max(...buckets.map((b) => b.cents), 1);
  const best = buckets.reduce<RevenueBucket | null>((top, b) => (b.cents > (top?.cents ?? 0) ? b : top), null);

  return (
    <Block title="Revenue">
      <p className="m-0 text-[13px] text-cream-muted">From item prices in each order. Fees are not included.</p>
      {!buckets.length ? (
        <EmptyState title="No orders yet.">Nothing to chart in this range.</EmptyState>
      ) : (
        <>
          <p className="m-0">
            <b className="font-display text-[40px] font-extrabold leading-none tabular-nums [font-stretch:80%]">{formatRM(totalCents)}</b>
            {best && buckets.length > 1 && (
              <span className="mt-1 block text-[13px] text-cream-muted">
                Best: {best.long}, {formatRM(best.cents)}
              </span>
            )}
          </p>
          <div aria-hidden className="flex h-[200px] items-end gap-1.5 pt-6 sm:gap-2">
            {buckets.map((b) => {
              const h = Math.round((b.cents / max) * 100);
              return (
                <div key={b.key} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${b.long}: ${formatRM(b.cents)}`}>
                  <div className="relative flex w-full max-w-12 flex-1 flex-col justify-end">
                    <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-cream px-2 py-0.5 text-xs font-semibold text-ink group-hover:block">
                      {formatRM(b.cents)}
                    </span>
                    <div
                      className={cn(
                        "w-full rounded-t-[10px] transition-colors",
                        b.highlight ? "bg-ember" : "bg-ember/35 group-hover:bg-ember/60",
                      )}
                      style={{ height: `${Math.max(h, b.cents > 0 ? 6 : 2)}%` }}
                    />
                  </div>
                  <span className={cn("max-w-full truncate text-center text-[11px] sm:text-xs", b.highlight ? "font-bold text-cream" : "text-cream-muted")}>
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
          <details className="group/amounts">
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-cream-muted underline">Show amounts</summary>
            <table className="mt-2 w-full border-collapse text-left text-sm">
              <caption className="sr-only">Revenue by period</caption>
              <thead>
                <tr className="border-b border-ink-line">
                  <th scope="col" className="type-admin-meta py-2 font-normal text-cream-faint">
                    Period
                  </th>
                  <th scope="col" className="type-admin-meta py-2 text-right font-normal text-cream-faint">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.key} className="border-b border-ink-line last:border-b-0">
                    <th scope="row" className={cn("py-2 text-left", b.highlight ? "font-bold" : "font-normal")}>
                      {b.long}
                    </th>
                    <td className="py-2 text-right tabular-nums">{formatRM(b.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Block>
  );
}

function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center font-semibold text-cream-muted underline">
      {children}
    </Link>
  );
}

function RecentActivity({ orders, range, limit = 6 }: { orders: Order[]; range: OrderDate; limit?: number }) {
  const rows = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  const now = Date.now();
  return (
    <section className="grid min-w-0 content-start gap-3" aria-labelledby="recent-activity">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="recent-activity" className="m-0 text-lg font-bold">
          Recent activity
        </h2>
        <SectionLink href={ordersFor(range)}>View all</SectionLink>
      </div>
      {rows.length ? (
        <ul className="m-0 grid list-none gap-2 p-0">
          {rows.map((o) => (
            <li key={o.id}>
              <Link
                href={`${ORDERS}/${o.id}`}
                className="flex min-w-0 items-start justify-between gap-3 rounded-card-sm bg-ink-raised p-3 text-cream no-underline transition-shadow hover:shadow-[inset_0_0_0_1px_theme(colors.cream.faint)]"
              >
                <span className="grid min-w-0 gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="text-base [overflow-wrap:anywhere]">{o.orderItems[0]?.menu?.name ?? "Order"}</b>
                    <OrderStatusChip status={o.status} />
                  </span>
                  <span className="text-[13px] text-cream-muted [overflow-wrap:anywhere]">
                    <span className="font-bold tracking-[0.04em]">{orderRef(o)}</span> · {o.customerName}
                  </span>
                </span>
                <span className="grid flex-none justify-items-end gap-1">
                  <b className="tabular-nums">{formatRM(orderLineCents(o))}</b>
                  <span className="text-[13px] text-cream-muted">{formatRelativeShort(o.createdAt, now)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No orders in this range.">New orders show here as they come in.</EmptyState>
      )}
    </section>
  );
}

function TopItems({ orders, range }: { orders: Order[]; range: OrderDate }) {
  const items = topItems(orders, 5);
  return (
    <section className="grid min-w-0 content-start gap-3" aria-labelledby="top-items">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="top-items" className="m-0 text-lg font-bold">
          Top items <span className="text-sm font-normal text-cream-muted">by quantity, {rangeLabel(range).toLowerCase()}</span>
        </h2>
        <SectionLink href={ordersFor(range)}>Filter orders</SectionLink>
      </div>
      {items.length ? (
        <ol className="m-0 grid list-none gap-2 p-0">
          {items.map((row, i) => (
            <li key={row.id} className="flex min-w-0 items-center gap-3 rounded-card-sm bg-ink-raised p-3">
              <span
                aria-hidden
                className="grid h-10 w-10 flex-none place-items-center rounded-full border border-cream-faint font-display text-xl font-extrabold [font-stretch:80%]"
              >
                {i + 1}
              </span>
              <span className="grid min-w-0 gap-0.5">
                <b className="truncate">{row.name}</b>
                <span className="text-[13px] text-cream-muted">{row.qty} sold</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="Nothing sold in this range." />
      )}
    </section>
  );
}

/** The open batch's item count against its limit (the old "Daily kitchen capacity" card). */
function KitchenLoad({ ctx, label, pct }: { ctx: CanOrderResponse; label: string | null; pct: number }) {
  return (
    <Block title="Kitchen load">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <b className="font-display text-[40px] font-extrabold leading-none tabular-nums [font-stretch:80%]">
            {ctx.current}
            <span className="text-[28px] text-cream-faint"> / {ctx.max}</span>
          </b>
          <span className="text-[13px] text-cream-muted">{label ?? "Items in the open batch"}</span>
        </div>
        {!ctx.canOrder && (
          <span className="type-admin-meta inline-flex h-7 items-center gap-1.5 rounded-full border border-cream-faint px-2.5 text-cream">
            <Lock aria-hidden size={14} strokeWidth={1.75} />
            Closed
          </span>
        )}
      </div>
      <div
        role="meter"
        aria-label="Kitchen load"
        aria-valuemin={0}
        aria-valuemax={Math.max(ctx.max, 1)}
        aria-valuenow={Math.min(ctx.current, Math.max(ctx.max, 1))}
        aria-valuetext={ctx.max > 0 ? `${ctx.current} of ${ctx.max} items, ${pct}%` : label ?? "No batch open"}
        className="h-2.5 overflow-hidden rounded-full bg-ink-line"
      >
        <div className={cn("h-full rounded-full", ctx.canOrder ? "bg-ember" : "bg-cream-faint")} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="m-0 text-[13px] text-cream-muted">
        Item totals for the published batch against its limit.{" "}
        <Link href="/admin/bun-theory/batches" className="font-semibold text-cream underline">
          Batches
        </Link>
      </p>
    </Block>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className={cn("h-[118px]", i === 2 && "col-span-2 lg:col-span-1")} />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-[360px] lg:col-span-2" />
        <Skeleton className="h-[260px]" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );
}
