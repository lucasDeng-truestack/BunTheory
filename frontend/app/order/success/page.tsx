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
  customerMainPaddingClass,
} from "@/components/layout/customer-shell";
import { cn } from "@/lib/utils";
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

      <main
        className={cn(
          "flex flex-1 flex-col py-8 sm:py-12 lg:py-14",
          customerMainPaddingClass
        )}
      >
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
            <div className="mx-auto w-full max-w-[min(100%,1600px)]">
              <div className="mb-10 text-center lg:mb-12">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-roast-red/10 text-roast-red lg:h-20 lg:w-20">
                  <CheckCircle className="h-9 w-9 lg:h-11 lg:w-11" aria-hidden />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-charcoal sm:text-3xl lg:text-4xl">
                  Thank you for your order!
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-pretty text-charcoal/70 lg:text-lg">
                  We&apos;ve sent a WhatsApp confirmation to your phone.
                </p>
                <p className="mt-4 text-sm text-charcoal/55">
                  Order{" "}
                  <span className="font-mono font-medium text-charcoal/80">
                    {order.slugId ? `#${order.slugId}` : order.id.slice(0, 8)}
                  </span>
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8 xl:gap-10">
                <OrderReceipt order={order} />
                <Card className="shadow-card lg:min-h-[200px]">
                  <CardContent className="p-6 sm:p-8">
                    <OrderStatusDisplay status={order.status} />
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center lg:mt-12 lg:max-w-2xl">
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
