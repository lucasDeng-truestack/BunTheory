"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Search, UtensilsCrossed } from "lucide-react";
import { listBatches, listMenu, listOrders, type Order } from "@/lib/bun-theory-api";
import {
  asOrderDate,
  batchOptionLabel,
  formatOrderTime,
  listStatusOptions,
  makeList,
  ORDER_DATES,
  orderBatchName,
  orderRef,
  paymentChoiceLabel,
  type OrderDate,
} from "@/lib/bun-theory";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { AdminPage, LoadError } from "@/components/admin/admin-page";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { LineExtras, OrderStatusChip, OrderStatusSelect, ReceiptLabel, useOrderStatus } from "@/components/admin/bun-theory/order-parts";

const BASE = "/admin/bun-theory/orders";

type View = { date: OrderDate; batch: string; item: string; q: string };

/** The filters live in the URL (?date=&batch=&item=&q=) so back from an order lands on the same list. */
export function ordersViewQuery(v: View) {
  const s = new URLSearchParams();
  if (v.date !== "week") s.set("date", v.date);
  if (v.batch) s.set("batch", v.batch);
  if (v.item) s.set("item", v.item);
  if (v.q.trim()) s.set("q", v.q.trim());
  const out = s.toString();
  return out ? `?${out}` : "";
}

export function OrdersScreen() {
  const params = useSearchParams();
  const fromParams = (): View => ({
    date: asOrderDate(params.get("date")),
    batch: params.get("batch") ?? "",
    item: params.get("item") ?? "",
    q: params.get("q") ?? "",
  });
  const [view, setViewState] = useState<View>(fromParams);
  // A navigation to this screen with another query (the menu link, Back) keeps it mounted:
  // take the filters from the URL. Our own replaceState writes match the view, so no loop.
  const query = params.toString();
  useEffect(() => {
    const next = fromParams();
    if (ordersViewQuery(next) !== ordersViewQuery(view)) {
      setViewState(next);
      setCustomer(next.q.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  // The search is sent 300ms after the last keystroke, not on every one.
  const [customer, setCustomer] = useState(view.q.trim());
  useEffect(() => {
    const t = window.setTimeout(() => setCustomer(view.q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [view.q]);

  const list = useAdminQuery(
    (t) =>
      listOrders(t, {
        date: view.date,
        customer: customer || undefined,
        menuId: view.item || undefined,
        batchId: view.batch || undefined,
      }),
    [view.date, view.batch, view.item, customer],
  );
  // Filter choices load once and never block the list. On a failure the pickers offer "All" only.
  const choices = useAdminQuery((t) => Promise.all([listBatches(t), listMenu(t, false)]), []);
  const [batches, menu] = choices.data ?? [[], []];

  // replaceState keeps the URL in step without a navigation per keystroke.
  const setView = (next: Partial<View>) => {
    const v = { ...view, ...next };
    setViewState(v);
    if (next.q === "") setCustomer("");
    window.history.replaceState(null, "", `${BASE}${ordersViewQuery(v)}`);
  };

  const filtered = view.batch || view.item || view.q.trim() || view.date !== "week";
  const status = useOrderStatus();
  const busy = list.loading && list.data !== undefined;

  return (
    <AdminPage
      title="Orders"
      lead="Filter by batch, date, item or customer, and move each order along."
      actions={
        <Button size="sm" variant="ghost" onClick={() => void list.reload()} loading={busy} loadingLabel="Refreshing">
          <span className="inline-flex items-center gap-2">
            <RefreshCw aria-hidden size={16} strokeWidth={1.75} />
            Refresh
          </span>
        </Button>
      }
    >
      <div className="grid grid-cols-2 items-end gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
        <div className="relative col-span-2 min-w-0 xl:col-span-1">
          <Field
            size="sm"
            type="search"
            label="Customer"
            placeholder="Name or phone"
            autoComplete="off"
            value={view.q}
            onChange={(e) => setView({ q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") setCustomer(view.q.trim());
            }}
            className="[&>input]:pl-10"
          />
          <Search aria-hidden size={16} strokeWidth={1.75} className="pointer-events-none absolute bottom-[14px] left-3.5 text-cream-faint" />
        </div>
        <SelectField size="sm" label="Date range" value={view.date} onChange={(e) => setView({ date: asOrderDate(e.target.value) })}>
          {ORDER_DATES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          size="sm"
          label="Batch"
          value={view.batch}
          onChange={(e) => setView({ batch: e.target.value })}
          help={choices.error ? "Batches did not load." : undefined}
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {batchOptionLabel(b)}
            </option>
          ))}
          {view.batch && !batches.some((b) => b.id === view.batch) && <option value={view.batch}>This batch</option>}
        </SelectField>
        <SelectField
          size="sm"
          label="Item"
          value={view.item}
          onChange={(e) => setView({ item: e.target.value })}
          help={choices.error ? "Menu items did not load." : undefined}
        >
          <option value="">All items</option>
          {menu.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
          {view.item && !menu.some((m) => m.id === view.item) && <option value={view.item}>This item</option>}
        </SelectField>
        {filtered ? (
          <Button size="sm" variant="ghost" onClick={() => setView({ date: "week", batch: "", item: "", q: "" })} className="max-xl:w-full">
            Clear filters
          </Button>
        ) : (
          <span aria-hidden className="max-xl:hidden" />
        )}
      </div>

      {status.notice && (
        <Banner tone={status.notice.tone} title={status.notice.title}>
          {status.notice.help}
        </Banner>
      )}

      {list.data === undefined ? (
        list.error ? (
          <LoadError onRetry={list.reload} />
        ) : (
          <ListSkeleton />
        )
      ) : (
        <>
          {list.error ? <LoadError onRetry={list.reload} /> : null}
          <OrdersView
            orders={list.data}
            filtered={!!filtered}
            busy={busy}
            detailQuery={ordersViewQuery(view)}
            savingId={status.savingId}
            onStatus={async (order, s) => {
              const updated = await status.change(order, s);
              if (updated) list.setData((cur) => cur?.map((o) => (o.id === updated.id ? updated : o)));
            }}
          />
        </>
      )}
    </AdminPage>
  );
}

/** Make list, then the table (1024px and up) or cards (phone and tablet). */
function OrdersView({
  orders,
  filtered,
  busy,
  detailQuery,
  savingId,
  onStatus,
}: {
  orders: Order[];
  filtered: boolean;
  busy: boolean;
  detailQuery: string;
  savingId: string | null;
  onStatus: (order: Order, status: Order["status"]) => void;
}) {
  const router = useRouter();
  const make = makeList(orders);
  const href = (o: Order) => `${BASE}/${o.id}${detailQuery}`;

  if (!orders.length) {
    return filtered ? (
      <EmptyState title="No orders match these filters.">Try a wider date range or clear the filters.</EmptyState>
    ) : (
      <EmptyState title="No orders in the last 7 days.">New orders show here as they come in.</EmptyState>
    );
  }

  return (
    <div aria-busy={busy || undefined} className={cn("grid gap-4 transition-opacity", busy && "opacity-70")}>
      <section aria-labelledby="make-list" className="grid gap-3 rounded-card-sm bg-ink-raised p-4">
        <h2 id="make-list" className="type-admin-meta m-0 flex items-center gap-2 text-cream-faint">
          <UtensilsCrossed aria-hidden size={16} strokeWidth={1.75} className="text-ember" />
          Make list: total to cook
        </h2>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {make.map((m) => (
            <li key={m.id} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cream-faint px-4">
              <span className="font-semibold">{m.name}</span>
              <b className="tabular-nums text-ember">{m.qty}×</b>
            </li>
          ))}
        </ul>
      </section>

      <p className="m-0 text-cream-muted">
        {orders.length} order{orders.length === 1 ? "" : "s"}
      </p>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["Order", "Batch", "Customer", "Items", "Type", "Payment", "Receipt", "Status"].map((h) => (
                <th key={h} className="type-admin-meta whitespace-nowrap border-b border-ink-line px-3 py-2.5 text-left text-cream-faint">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => router.push(href(o))}
                className="cursor-pointer [&>td]:border-b [&>td]:border-ink-line [&>td]:px-3 [&>td]:py-3 [&>td]:align-top hover:[&>td]:bg-ink-soft"
              >
                <td className="whitespace-nowrap">
                  <Link href={href(o)} onClick={(e) => e.stopPropagation()} className="font-bold tracking-[0.04em] text-cream no-underline hover:underline">
                    {orderRef(o)}
                  </Link>
                  <small className="block text-xs text-cream-muted">{formatOrderTime(o.createdAt)}</small>
                </td>
                <td className="max-w-[120px] text-cream-muted [overflow-wrap:anywhere]">{orderBatchName(o)}</td>
                <td className="min-w-[140px]">
                  <b className="block [overflow-wrap:anywhere]">{o.customerName}</b>
                  <small className="block text-xs text-cream-muted">{o.phone}</small>
                </td>
                <td className="min-w-[200px] max-w-[22rem]">
                  <ul className="m-0 grid list-none gap-2 p-0">
                    {o.orderItems.map((oi) => (
                      <li key={oi.id}>
                        <span className="font-semibold">
                          <span className="text-ember">{oi.quantity}×</span> {oi.menu?.name ?? "Item"}
                        </span>
                        <LineExtras oi={oi} className="mt-0.5" />
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="whitespace-nowrap">{o.type === "DELIVERY" ? "Delivery" : "Pickup"}</td>
                <td className="whitespace-nowrap">{paymentChoiceLabel(o)}</td>
                <td>
                  <ReceiptLabel order={o} />
                </td>
                <td onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="min-w-[164px]">
                  <OrderStatusSelect
                    order={o}
                    options={listStatusOptions(o.status)}
                    saving={savingId === o.id}
                    onChange={(s) => onStatus(o, s)}
                    label={<span className="sr-only">Status of order {orderRef(o)}</span>}
                    className="[&>label]:contents"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="m-0 grid list-none gap-2 p-0 lg:hidden">
        {orders.map((o) => (
          <li key={o.id} className="grid gap-3 rounded-card-sm bg-ink-raised p-3">
            <Link href={href(o)} className="grid gap-2 text-cream no-underline">
              <span className="flex items-start justify-between gap-3">
                <span className="grid min-w-0 gap-0.5">
                  <b className="text-base [overflow-wrap:anywhere]">{o.customerName}</b>
                  <span className="text-[13px] text-cream-muted">
                    <span className="font-bold tracking-[0.04em]">{orderRef(o)}</span> · {formatOrderTime(o.createdAt)}
                  </span>
                </span>
                <OrderStatusChip status={o.status} className="flex-none" />
              </span>
              <span className="grid gap-1 text-sm">
                {o.orderItems.map((oi) => (
                  <span key={oi.id} className="block">
                    <span className="font-semibold">
                      <span className="text-ember">{oi.quantity}×</span> {oi.menu?.name ?? "Item"}
                    </span>
                    <LineExtras oi={oi} className="mt-0.5" />
                  </span>
                ))}
              </span>
              <span className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-cream-muted">
                <span>{o.type === "DELIVERY" ? "Delivery" : "Pickup"}</span>
                <span>{paymentChoiceLabel(o)}</span>
                <span>
                  Receipt: <ReceiptLabel order={o} />
                </span>
                <span>Batch: {orderBatchName(o)}</span>
              </span>
            </Link>
            <OrderStatusSelect
              order={o}
              options={listStatusOptions(o.status)}
              saving={savingId === o.id}
              onChange={(s) => onStatus(o, s)}
              label={<span className="sr-only">Status of order {orderRef(o)}</span>}
              className="[&>label]:contents"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-3">
      <Skeleton className="h-24" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[120px]" />
      ))}
    </div>
  );
}
