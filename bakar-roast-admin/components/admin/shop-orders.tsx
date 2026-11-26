"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  shopAdminCancel,
  shopAdminListOrders,
  shopAdminMarkPayment,
  type ShopOrderAdmin,
  type ShopOrderStatus,
} from "@/lib/shop-api";
import { formatDateLabel, formatRm, slotLabel } from "@/lib/shop";
import { EmptyState, Skeleton } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { AdminPage, LoadError } from "@/components/admin/admin-page";
import { useAdmin } from "@/components/admin/admin-context";
import { useAdminQuery } from "@/components/admin/use-admin-query";

type Tab = "AWAITING_PAYMENT" | "DEPOSIT_PAID" | "PAID" | "ALL";
const TABS: { key: Tab; label: string }[] = [
  { key: "AWAITING_PAYMENT", label: "Awaiting" },
  { key: "DEPOSIT_PAID", label: "Deposit" },
  { key: "PAID", label: "Paid" },
  { key: "ALL", label: "All" },
];

const STATUS_LABEL: Record<ShopOrderStatus, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  DEPOSIT_PAID: "Deposit received",
  PAID: "Paid in full",
  CANCELLED: "Cancelled",
};

function OrderCard({ order, onChanged }: { order: ShopOrderAdmin; onChanged: () => void }) {
  const { run } = useAdmin();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (label: string, call: (token: string) => Promise<unknown>) => {
    setBusy(label);
    try {
      await run(call);
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const address =
    order.type === "DELIVERY" && order.address
      ? [order.address.line1, order.address.line2, `${order.address.postcode} ${order.address.city}`, order.address.state]
          .filter(Boolean)
          .join(", ")
      : order.pickupArea ?? "Pickup";

  return (
    <div className="grid gap-3 rounded-card-sm border border-cream-faint p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <b className="font-semibold text-cream">{order.reference}</b>
          <span className="text-[12px] uppercase tracking-wide text-cream-faint">
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        <span className="text-cream">{formatRm(order.total)}</span>
      </div>

      <div className="grid gap-1 text-[14px] text-cream-muted">
        <span className="text-cream">
          {order.customerName} · {order.customerPhone}
        </span>
        <span>
          {order.type === "DELIVERY" ? "Deliver" : "Pickup"} · {formatDateLabel(order.fulfilmentDate)} ·{" "}
          {slotLabel(order.timeSlot)}
        </span>
        <span>{address}</span>
        <span>{order.items.map((i) => `${i.quantity}× ${i.packageName}`).join(", ")}</span>
        <span>
          Pay now: {formatRm(order.amountDue)} ({order.paymentChoice === "FULL" ? "full" : "half"})
        </span>
      </div>

      {order.receipts.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[13px]">
          <span className="text-cream-faint">Receipts:</span>
          {order.receipts.map((r, i) => (
            <a key={r.id} href={r.fileUrl} target="_blank" rel="noreferrer" className="text-cream hover:text-ember">
              #{i + 1}
            </a>
          ))}
        </div>
      )}

      {order.status !== "CANCELLED" && order.status !== "PAID" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {order.status === "AWAITING_PAYMENT" && (
            <Button
              size="sm"
              variant="cream"
              loading={busy === "deposit"}
              loadingLabel="Saving"
              disabled={!!busy}
              onClick={() => act("deposit", (t) => shopAdminMarkPayment(t, order.id, "DEPOSIT"))}
            >
              Deposit received
            </Button>
          )}
          <Button
            size="sm"
            loading={busy === "full"}
            loadingLabel="Saving"
            disabled={!!busy}
            onClick={() => act("full", (t) => shopAdminMarkPayment(t, order.id, "FULL"))}
          >
            Paid in full
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!!busy}
            onClick={() => {
              if (confirm(`Cancel order ${order.reference}?`)) {
                void act("cancel", (t) => shopAdminCancel(t, order.id));
              }
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function ShopOrdersScreen() {
  const [tab, setTab] = useState<Tab>("AWAITING_PAYMENT");
  const { data, loading, error, reload } = useAdminQuery(
    (token) => shopAdminListOrders(token, tab),
    [tab],
  );

  return (
    <AdminPage title="Orders" eyebrow="Bakar & Roast" lead="Confirm a payment once you have received it.">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === t.key ? "border-ember bg-ember/10 text-cream" : "border-cream-faint text-cream-muted hover:text-cream",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <LoadError onRetry={reload} />
      ) : loading && data === undefined ? (
        <div className="grid gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState title="No orders here yet">New orders land here as customers place them.</EmptyState>
      ) : (
        <div className="grid gap-3">
          {data.map((o) => (
            <OrderCard key={o.id} order={o} onChanged={reload} />
          ))}
        </div>
      )}
    </AdminPage>
  );
}
