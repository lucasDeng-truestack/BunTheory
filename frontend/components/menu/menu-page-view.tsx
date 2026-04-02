"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { FoodGrid } from "@/components/menu/food-grid";
import { MenuItemModal } from "@/components/menu/menu-item-modal";
import { OrderCounter } from "@/components/order/order-counter";
import { Cart } from "@/components/order/cart";
import { CartDrawer } from "@/components/order/cart-drawer";
import { Button } from "@/components/ui/button";
import {
  CustomerPageShell,
  CustomerTopBar,
  customerMainPaddingClass,
} from "@/components/layout/customer-shell";
import { cn } from "@/lib/utils";
import { StatusBanner } from "@/components/layout/status-banner";
import { MenuHighlights } from "@/components/menu/menu-highlights";
import { useCartStore } from "@/store/cart.store";
import type { MenuItem } from "@/types/menu";
import { getMenu } from "@/services/menu.service";
import { getCanOrder, type CanOrderResponse } from "@/services/orders.service";
import { formatBatchLabel } from "@/lib/batch-display";
import { ShoppingCart } from "lucide-react";

function closedBanner(ctx: CanOrderResponse): {
  title: string;
  description: string;
} | null {
  if (ctx.canOrder) return null;
  if (ctx.reason === "OK") {
    return {
      title: "Ordering paused",
      description:
        "The storefront is temporarily not accepting new orders. Try again later.",
    };
  }
  switch (ctx.reason) {
    case "FULL":
      return {
        title: "This batch is full",
        description:
          "We’ve reached the limit for the current order window. The menu below is for browsing until the next batch.",
      };
    case "DISABLED":
      return {
        title: "Ordering is turned off",
        description: "Please check back when we reopen ordering.",
      };
    case "NO_BATCH":
      return {
        title: "No order batch is open",
        description:
          "Check back when we publish the next pickup / delivery window.",
      };
    default:
      return {
        title: "Ordering unavailable",
        description: "Please try again later.",
      };
  }
}

type MenuPageViewProps = {
  menuItems: MenuItem[];
  canOrder: CanOrderResponse;
};

export function MenuPageView({ menuItems, canOrder }: MenuPageViewProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [liveMenuItems, setLiveMenuItems] = useState(menuItems);
  const [batchCtx, setBatchCtx] = useState(canOrder);
  const [menuRefreshError, setMenuRefreshError] = useState(false);
  const hydrated = useHydrated();
  const count = useCartStore((s) => s.itemCount());

  useEffect(() => {
    setBatchCtx(canOrder);
  }, [canOrder]);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      Promise.all([getMenu(false), getCanOrder()])
        .then(([items, co]) => {
          if (cancelled) return;
          setLiveMenuItems(items);
          setBatchCtx(co);
          setMenuRefreshError(false);
        })
        .catch(() => {
          if (cancelled) return;
          setMenuRefreshError(true);
        });
    };

    refresh();
    const id = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const openItem = (item: MenuItem) => {
    if (item.soldOut || !item.available) return;
    setModalItem(item);
    setModalOpen(true);
  };

  const banner = closedBanner(batchCtx);
  const batchLabel = formatBatchLabel(batchCtx);
  const favoriteItems = liveMenuItems.filter(
    (item) => item.available && !item.soldOut && item.image && item.isFavorite
  );

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
              <span className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-roast-red px-1 text-xs font-bold leading-none text-white">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </Button>
        }
      />

      <main
        className={cn(
          "flex flex-1 flex-col py-6 sm:py-8 lg:py-10",
          customerMainPaddingClass
        )}
      >
        <div className="mb-6 lg:mb-8">
          <OrderCounter
            current={batchCtx.current}
            max={batchCtx.max}
            canOrder={batchCtx.canOrder}
            batchLabel={batchLabel}
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

        {banner && (
          <div className="mb-6">
            <StatusBanner
              variant="warning"
              title={banner.title}
              description={banner.description}
            />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10 xl:gap-12">
          <div className="lg:col-span-7 xl:col-span-8">
            {favoriteItems.length > 0 && (
              <div className="mb-8 lg:mb-10">
                <MenuHighlights
                  items={favoriteItems}
                  limit={2}
                  eyebrow="Crowd Favorites"
                  title="Most loved right now"
                  description="Quick picks from the items marked as favorites in admin."
                  gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
                />
              </div>
            )}

            <div className="mb-6 lg:mb-8">
              <p className="text-section-label">Menu</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl font-display">
                Popular picks
              </h2>
              <p className="mt-2 max-w-2xl text-pretty text-sm text-charcoal/65 lg:text-base">
                Tap an item to choose options and add to cart. On larger screens the cart
                stays visible on the right.
              </p>
            </div>
            <div className="rounded-3xl border border-charcoal/10 bg-white/70 p-4 shadow-card sm:p-6 md:p-8 lg:rounded-[1.75rem]">
              <FoodGrid items={liveMenuItems} onOpenItem={openItem} />
            </div>
          </div>

          <div className="hidden lg:col-span-5 xl:col-span-4 lg:block">
            <div className="lg:sticky lg:top-24">
              <p className="text-section-label-muted mb-3">Your cart</p>
              <Cart heading="Your cart" />
            </div>
          </div>
        </div>
      </main>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <MenuItemModal
        item={modalItem}
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setModalItem(null);
        }}
      />
    </CustomerPageShell>
  );
}
