"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { OrderReceipt } from "@/components/order/order-receipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from "@/lib/constants";
import {
  paymentChoiceLabel,
  receiptStatusLabel,
} from "@/lib/order-payment-labels";
import { getOrder, updateOrderStatus } from "@/services/orders.service";
import type { Order, OrderStatus } from "@/types/order";
import { ChevronLeft, ExternalLink, Loader2 } from "lucide-react";
import { isPdfReceiptUrl } from "@/lib/receipt-url";
import { useAdminChrome } from "@/components/admin/admin-chrome-context";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { refreshPendingOrdersCount } = useAdminChrome();

  const load = useCallback(async () => {
    const t =
      typeof window !== "undefined"
        ? localStorage.getItem("admin_token")
        : null;
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setToken(t);
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    try {
      const o = await getOrder(id, t);
      setOrder(o);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusChange = async (status: OrderStatus) => {
    if (!order || !token) return;
    try {
      await updateOrderStatus(order.id, status, token);
      void refreshPendingOrdersCount();
      const o = await getOrder(order.id, token);
      setOrder(o);
      toast.success("Order status updated", {
        description: `Status set to ${ORDER_STATUS_LABELS[status]}. Customer will receive a WhatsApp notification.`,
      });
    } catch {
      toast.error("Failed to update order status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-roast-red" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="space-y-6">
        <Button variant="outline" className="font-display" asChild>
          <Link href="/admin/orders">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to orders
          </Link>
        </Button>
        <p className="text-charcoal/70">{notFound ? "Order not found." : "Loading failed."}</p>
      </div>
    );
  }

  const receiptUrl = order.paymentReceiptUrl?.trim();
  const showReceipt = order.paymentChoice === "PAY_NOW";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="outline" size="sm" className="font-display mb-4" asChild>
            <Link href="/admin/orders">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to orders
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold tracking-tight text-charcoal lg:text-4xl">
            Order #{order.slugId ?? order.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-base text-charcoal/70">
            {order.customerName} · {order.phone}
          </p>
          <p className="mt-1 text-sm text-charcoal/60">
            {new Date(order.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="font-display text-sm font-semibold text-charcoal/80">
            Status
          </span>
          <Select
            value={order.status}
            onValueChange={(v) => void handleStatusChange(v as OrderStatus)}
          >
            <SelectTrigger className="w-full min-h-11 rounded-xl font-display sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUS_STEPS.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <OrderReceipt order={order} title="Line items" />

        <Card className="overflow-hidden border-charcoal/10 shadow-card">
          <CardHeader className="border-b border-charcoal/10 bg-cream/30">
            <CardTitle className="font-display text-lg">Fulfillment</CardTitle>
            <p className="text-sm font-normal text-charcoal/65">
              {order.type === "DELIVERY" ? "Delivery" : "Pickup"}
              {order.batch?.label?.trim()
                ? ` · ${order.batch.label.trim()}`
                : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="font-display text-sm font-semibold text-charcoal/80">
                Payment
              </p>
              <p className="mt-1 text-sm text-charcoal/80">
                {paymentChoiceLabel(order)}
              </p>
              <p className="mt-2 text-sm text-charcoal/65">
                Receipt: {receiptStatusLabel(order)}
              </p>
            </div>
            {showReceipt && (
              <div>
                <p className="font-display text-sm font-semibold text-charcoal/80">
                  Payment receipt
                </p>
                {receiptUrl ? (
                  isPdfReceiptUrl(receiptUrl) ? (
                    <div className="mt-3 space-y-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-display w-full max-w-md sm:w-auto"
                        asChild
                      >
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open receipt PDF
                        </a>
                      </Button>
                      <iframe
                        title={`Payment receipt PDF for order ${order.slugId ?? order.id.slice(0, 8)}`}
                        src={receiptUrl}
                        className="h-[min(55vh,480px)] w-full max-w-md rounded-xl border border-charcoal/10 bg-white"
                      />
                    </div>
                  ) : (
                    <div className="relative mt-3 aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border border-charcoal/10 bg-charcoal/[0.03]">
                      <Image
                        src={receiptUrl}
                        alt={`Payment receipt for order ${order.slugId ?? order.id.slice(0, 8)}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 400px"
                        unoptimized={
                          receiptUrl.startsWith("data:") ||
                          !/^https?:\/\//i.test(receiptUrl)
                        }
                      />
                    </div>
                  )
                ) : (
                  <p className="mt-2 rounded-xl border border-dashed border-charcoal/20 bg-cream/40 px-4 py-8 text-center text-sm text-charcoal/60">
                    No receipt uploaded yet. Customer chose Pay now and can
                    upload from checkout.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
