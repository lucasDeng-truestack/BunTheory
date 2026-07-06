"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { getOrders } from "@/services/orders.service";
import type { Order } from "@/types/order";
import { formatRM, toAmount } from "@/lib/money";
import { isPdfReceiptUrl } from "@/lib/receipt-url";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { Loader2, RefreshCw, ExternalLink, ReceiptText } from "lucide-react";

function expectedTotal(o: Order): number {
  if (o.total != null) return toAmount(o.total);
  return o.orderItems.reduce(
    (s, i) => s + toAmount(i.unitPrice) * i.quantity,
    0
  );
}

export default function AdminReceiptsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const t = localStorage.getItem("admin_token");
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    try {
      const o = await getOrders(t, { paymentOnly: true, date: "all" });
      setOrders(o);
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-roast-red" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Receipts"
        description="QR payments awaiting review. Check each uploaded receipt against the expected amount."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-charcoal/10 bg-white p-10 text-center shadow-card">
          <ReceiptText className="mx-auto h-10 w-10 text-charcoal/30" />
          <p className="mt-3 font-display font-semibold text-charcoal">
            No receipts yet
          </p>
          <p className="mt-1 text-sm text-charcoal/60">
            QR payments with uploaded receipts will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => {
            const url = order.paymentReceiptUrl?.trim();
            const pdf = url ? isPdfReceiptUrl(url) : false;
            return (
              <div
                key={order.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-card"
              >
                <div className="relative aspect-[4/3] bg-charcoal/[0.03]">
                  {url ? (
                    pdf ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-full w-full flex-col items-center justify-center gap-2 text-charcoal/60 hover:text-roast-red"
                      >
                        <ExternalLink className="h-8 w-8" />
                        <span className="text-sm font-medium">Open receipt PDF</span>
                      </a>
                    ) : (
                      <Image
                        src={url}
                        alt={`Receipt for ${order.slugId ?? order.id.slice(0, 8)}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 400px"
                        unoptimized={
                          url.startsWith("data:") || !/^https?:\/\//i.test(url)
                        }
                      />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-charcoal/40">
                      No receipt
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-charcoal">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-charcoal/55">
                        {order.slugId ?? order.id.slice(0, 8)} ·{" "}
                        {new Date(order.createdAt).toLocaleString("en-MY", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-charcoal/10 px-2 py-0.5 text-[11px] font-semibold text-charcoal/70">
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-charcoal/10 pt-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-charcoal/45">
                        Expected
                      </p>
                      <p className="font-display text-lg font-bold text-roast-red">
                        {formatRM(expectedTotal(order))}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/orders/${order.id}`}>View order</Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
