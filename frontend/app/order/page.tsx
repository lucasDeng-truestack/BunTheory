import Link from "next/link";
import { getCanOrder } from "@/lib/menu-data";
import { OrderCounter } from "@/components/order/order-counter";
import { Cart } from "@/components/order/cart";
import { OrderForm } from "@/components/order/order-form";
import { Button } from "@/components/ui/button";
import {
  CustomerPageShell,
  CustomerTopBar,
  customerMainPaddingClass,
} from "@/components/layout/customer-shell";
import { cn } from "@/lib/utils";
import { StatusBanner } from "@/components/layout/status-banner";
import { formatBatchLabel, checkoutClosedCopy } from "@/lib/batch-display";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const canOrder = await getCanOrder();
  const batchLabel = formatBatchLabel(canOrder);
  const closed = checkoutClosedCopy(canOrder);

  return (
    <CustomerPageShell>
      <CustomerTopBar
        title="Checkout"
        backHref="/menu"
        backLabel="Menu"
      />

      <main
        className={cn(
          "flex flex-1 flex-col py-6 sm:py-8 lg:py-10",
          customerMainPaddingClass
        )}
      >
        <div className="mb-6 lg:mb-8">
          <OrderCounter
            current={canOrder.current}
            max={canOrder.max}
            canOrder={canOrder.canOrder}
            batchLabel={batchLabel}
          />
        </div>

        {!canOrder.canOrder ? (
          <>
            <StatusBanner
              variant="warning"
              title={closed.title}
              description={closed.description}
              className="mb-6"
            />
            <div className="flex justify-center">
              <Button asChild variant="outline" size="lg" className="min-w-[200px]">
                <Link href="/menu">Back to menu</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="mx-auto w-full max-w-[min(100%,1600px)]">
            <div className="mb-6 lg:mb-8">
              <p className="text-section-label">Checkout</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
                Almost there
              </h2>
              <p className="mt-2 max-w-2xl text-pretty text-sm text-charcoal/65 lg:text-base">
                Review your items and send your details — we&apos;ll confirm on WhatsApp.
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10 xl:gap-12">
              <section aria-labelledby="checkout-cart-heading">
                <h2
                  id="checkout-cart-heading"
                  className="mb-3 text-lg font-semibold tracking-tight text-charcoal lg:text-xl"
                >
                  Your order
                </h2>
                <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-4 shadow-card sm:p-6">
                  <Cart showCheckoutButton={false} heading="Items" />
                </div>
              </section>
              <section aria-labelledby="checkout-details-heading">
                <h2
                  id="checkout-details-heading"
                  className="mb-3 text-lg font-semibold tracking-tight text-charcoal lg:text-xl"
                >
                  Contact &amp; type
                </h2>
                <div className="rounded-3xl border border-charcoal/10 bg-white p-4 shadow-card sm:p-6 lg:p-8">
                  <OrderForm />
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </CustomerPageShell>
  );
}
