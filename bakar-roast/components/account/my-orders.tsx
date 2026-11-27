"use client";

import { useCallback, useEffect, useState, type Ref } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { getShopMe, type ShopOrderMine } from "@/lib/shop-api";
import { accountCopy } from "@/lib/content";
import { formatDateLabel, formatRm, orderPath, slotLabel } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { Banner, EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/headline";
import { accent } from "@/components/sections/accent";

const o = accountCopy.orders;
const textButton =
  "inline-flex min-h-11 w-fit items-center font-semibold text-cream underline decoration-ember underline-offset-4";

/** What the customer needs to know about an order at a glance. */
function orderState(order: ShopOrderMine): { label: string; strong: boolean } {
  if (order.status === "CANCELLED") return { label: "Cancelled", strong: false };
  if (order.status === "PAID") return { label: "Paid in full", strong: true };
  if (order.status === "DEPOSIT_PAID") return { label: "Deposit received", strong: true };
  return order.receiptUploaded ? { label: "Checking payment", strong: true } : { label: "Not paid yet", strong: false };
}

function OrderCard({ order }: { order: ShopOrderMine }) {
  const state = orderState(order);
  const toPay = order.status === "AWAITING_PAYMENT" && !order.receiptUploaded;
  return (
    <li>
      <Link
        href={orderPath(order.accessToken)}
        className="grid gap-3 rounded-card-md border border-ink-line bg-ink-raised p-5 text-cream no-underline transition-colors hover:border-cream-faint"
      >
        <span className="flex flex-wrap items-center justify-between gap-3">
          <b className="font-semibold tracking-[0.06em]">{order.reference}</b>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide",
              state.strong ? "bg-ember/15 text-ember" : "bg-ink-line text-cream-muted",
            )}
          >
            {state.label}
          </span>
        </span>
        <span className="text-xl font-bold">
          {formatDateLabel(order.fulfilmentDate)} · {slotLabel(order.timeSlot)}
        </span>
        <span className="type-small text-cream-muted [overflow-wrap:anywhere]">
          {order.type === "DELIVERY" ? "Delivery" : "Pickup"} · {order.summary}
        </span>
        <span className="type-small flex flex-wrap items-center justify-between gap-3 text-cream-muted">
          <b className="text-cream">{formatRm(order.total)}</b>
          <span aria-hidden className="font-semibold text-cream underline decoration-ember underline-offset-4">
            {toPay ? o.pay : o.open}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Signed-in view of /account: the customer's orders, newest first. A 401 means the token is dead. */
export function MyOrders({
  email,
  token,
  onExpired,
  onSignOut,
  headingRef,
}: {
  email: string;
  token: string;
  onExpired: () => void;
  onSignOut: () => Promise<void>;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const [orders, setOrders] = useState<ShopOrderMine[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setOrders(null);
    try {
      setOrders((await getShopMe(token)).orders);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onExpired();
      setFailed(true);
    }
  }, [token, onExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  let body;
  if (failed) {
    body = (
      <Banner tone="error" title={o.loadFailed}>
        <span className="flex flex-wrap items-center gap-x-4">
          <span>{o.loadFailedHelp}</span>
          <button type="button" onClick={() => void load()} className={textButton}>
            {o.retry}
          </button>
        </span>
      </Banner>
    );
  } else if (!orders) {
    body = (
      <div aria-busy="true" aria-label="Loading your orders" className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[176px] rounded-card-md" />
        ))}
      </div>
    );
  } else if (!orders.length) {
    body = <EmptyState title={o.empty}>{o.emptyHelp}</EmptyState>;
  } else {
    body = (
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {orders.map((order) => (
          <OrderCard key={order.reference} order={order} />
        ))}
      </ul>
    );
  }

  return (
    <div className="grid gap-8">
      <div className="grid justify-items-start gap-5">
        <Eyebrow>
          <span className="min-w-0 break-all">
            {o.eyebrow} <span className="normal-case tracking-normal">{email}</span>
          </span>
        </Eyebrow>
        <h1 ref={headingRef} tabIndex={-1} className="display-lg m-0 text-balance focus:outline-none">
          {accent(o.headline)}
        </h1>
      </div>
      {body}
      <div className="flex flex-wrap items-center gap-3">
        <Button href="/order">{o.order}</Button>
        <Button
          type="button"
          variant="ghost"
          loading={signingOut}
          loadingLabel={o.signingOut}
          onClick={() => {
            setSigningOut(true);
            void onSignOut();
          }}
        >
          {o.signOut}
        </Button>
      </div>
    </div>
  );
}
