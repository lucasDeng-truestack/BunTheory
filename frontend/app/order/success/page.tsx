import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderStatusDisplay } from "@/components/order/order-status";
import { OrderReceipt } from "@/components/order/order-receipt";
import { OrderSuccessRedirect } from "@/components/order/order-success-redirect";
import { getOrder } from "@/lib/order-data";
import { CheckCircle } from "lucide-react";
import {
  CustomerPageShell,
  CustomerTopBar,
} from "@/components/layout/customer-shell";
import { Card, CardContent } from "@/components/ui/card";
import type { Order } from "@/types/order";

export const dynamic = "force-dynamic";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let order: Order | null = null;
  let loadFailed = false;

  if (id) {
    try {
      order = await getOrder(id);
    } catch {
      loadFailed = true;
    }
  }

  return (
    <CustomerPageShell>
      <CustomerTopBar title="Order confirmed" backHref="/menu" backLabel="Menu" />

      <main className="py-8 sm:py-12">
        {!id && <OrderSuccessRedirect />}

        {id && loadFailed && (
          <div className="mx-auto max-w-md space-y-4 text-center">
            <p className="text-pretty text-charcoal/70">
              We couldn&apos;t load this order. It may have expired or the link
              is incorrect.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="min-h-12">
                <Link href="/menu">Browse menu</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-12">
                <Link href="/">Home</Link>
              </Button>
            </div>
          </div>
        )}

        {id && !loadFailed && order && (
          <>
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-roast-red/10 text-roast-red">
                <CheckCircle className="h-9 w-9" aria-hidden />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-charcoal">
                Thank you for your order!
              </h2>
              <p className="mt-2 text-pretty text-charcoal/70">
                We&apos;ve sent a WhatsApp confirmation to your phone.
              </p>
              <p className="mt-3 text-sm text-charcoal/55">
                Order{" "}
                <span className="font-mono font-medium text-charcoal/80">
                  {order.slugId ? `#${order.slugId}` : order.id.slice(0, 8)}
                </span>
              </p>
            </div>

            <OrderReceipt order={order} />

            <Card className="mx-auto mt-6 max-w-md">
              <CardContent className="p-6">
                <OrderStatusDisplay status={order.status} />
              </CardContent>
            </Card>

            <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="w-full min-h-14 sm:w-auto sm:min-w-[180px]"
              >
                <Link href="/menu">Order more</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full min-h-14 sm:w-auto sm:min-w-[180px]"
              >
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </CustomerPageShell>
  );
}
