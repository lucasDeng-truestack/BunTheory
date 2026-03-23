import Link from "next/link";
import { getCanOrder } from "@/lib/menu-data";
import { OrderCounter } from "@/components/order/order-counter";
import { Cart } from "@/components/order/cart";
import { OrderForm } from "@/components/order/order-form";
import { Button } from "@/components/ui/button";
import {
  CustomerPageShell,
  CustomerTopBar,
} from "@/components/layout/customer-shell";
import { StatusBanner } from "@/components/layout/status-banner";

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const canOrder = await getCanOrder();

  return (
    <CustomerPageShell>
      <CustomerTopBar
        title="Checkout"
        backHref="/menu"
        backLabel="Menu"
      />

      <main className="py-6 sm:py-8">
        <div className="mb-6">
          <OrderCounter
            current={canOrder.current}
            max={canOrder.max}
            canOrder={canOrder.canOrder}
          />
        </div>

        {!canOrder.canOrder ? (
          <>
            <StatusBanner
              variant="warning"
              title="Ordering closed today"
              description="We’ve reached our daily limit. You can still browse the menu for tomorrow."
              className="mb-6"
            />
            <div className="flex justify-center">
              <Button asChild variant="outline" size="lg" className="min-w-[200px]">
                <Link href="/menu">Back to menu</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="mx-auto grid max-w-2xl gap-8 lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-10">
            <section aria-labelledby="checkout-cart-heading">
              <h2
                id="checkout-cart-heading"
                className="mb-3 text-lg font-semibold tracking-tight text-charcoal"
              >
                Your order
              </h2>
              <Cart showCheckoutButton={false} heading="Items" />
            </section>
            <section aria-labelledby="checkout-details-heading">
              <h2
                id="checkout-details-heading"
                className="mb-3 text-lg font-semibold tracking-tight text-charcoal"
              >
                Contact &amp; type
              </h2>
              <div className="rounded-2xl border border-charcoal/10 bg-white p-4 shadow-card sm:p-6">
                <OrderForm />
              </div>
            </section>
          </div>
        )}
      </main>
    </CustomerPageShell>
  );
}
