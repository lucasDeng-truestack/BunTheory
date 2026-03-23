"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { FoodGrid } from "@/components/menu/food-grid";
import { OrderCounter } from "@/components/order/order-counter";
import { Cart } from "@/components/order/cart";
import { CartDrawer } from "@/components/order/cart-drawer";
import { Button } from "@/components/ui/button";
import {
  CustomerPageShell,
  CustomerTopBar,
} from "@/components/layout/customer-shell";
import { StatusBanner } from "@/components/layout/status-banner";
import { useCartStore } from "@/store/cart.store";
import type { MenuItem } from "@/types/menu";
import { getMenu } from "@/services/menu.service";
import type { CanOrderResponse } from "@/services/orders.service";
import { ShoppingCart } from "lucide-react";

type MenuPageViewProps = {
  menuItems: MenuItem[];
  canOrder: CanOrderResponse;
};

export function MenuPageView({ menuItems, canOrder }: MenuPageViewProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [liveMenuItems, setLiveMenuItems] = useState(menuItems);
  const [menuRefreshError, setMenuRefreshError] = useState(false);
  const hydrated = useHydrated();
  const count = useCartStore((s) => s.itemCount());

  useEffect(() => {
    let cancelled = false;

    getMenu(false)
      .then((items) => {
        if (cancelled) return;
        setLiveMenuItems(items);
        setMenuRefreshError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMenuRefreshError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CustomerPageShell>
      <CustomerTopBar
        title="Menu"
        backHref="/"
        backLabel="Home"
        right={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative shrink-0 lg:hidden"
            onClick={() => setCartOpen(true)}
            aria-label={
              hydrated && count > 0
                ? `Open cart, ${count} items`
                : "Open cart"
            }
          >
            <ShoppingCart className="h-5 w-5" />
            {hydrated && count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-roast-red px-1 text-[10px] font-bold leading-none text-white">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </Button>
        }
      />

      <main className="py-6 sm:py-8">
        <div className="mb-6">
          <OrderCounter
            current={canOrder.current}
            max={canOrder.max}
            canOrder={canOrder.canOrder}
          />
        </div>

        {menuRefreshError && (
          <div className="mb-6">
            <StatusBanner
              variant="info"
              title="Showing saved menu"
              description="We couldn't refresh the latest menu from the backend, so this page is using the last server response."
            />
          </div>
        )}

        {!canOrder.canOrder && (
          <div className="mb-6">
            <StatusBanner
              variant="warning"
              title="Ordering is closed for today"
              description="We’ve reached our daily limit. Please check back tomorrow."
            />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3 lg:items-start lg:gap-10">
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-charcoal">
              Popular picks
            </h2>
            <FoodGrid items={liveMenuItems} />
          </div>

          <div className="hidden lg:col-span-1 lg:block">
            <div className="lg:sticky lg:top-24">
              <Cart heading="Your cart" />
            </div>
          </div>
        </div>
      </main>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </CustomerPageShell>
  );
}
