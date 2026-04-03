"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useCartStore, type CartItem } from "@/store/cart.store";
import type { MenuItem } from "@/types/menu";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import { toast } from "sonner";
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
  const [editLineKey, setEditLineKey] = useState<string | null>(null);
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
    setEditLineKey(null);
    setModalItem(item);
    setModalOpen(true);
  };

  const openCartItemEdit = (cartItem: CartItem) => {
    const menuItem = liveMenuItems.find(
      (m) =>
        (cartItem.menuId && m.id === cartItem.menuId) ||
        normalizeMenuSlug(m.slug) === normalizeMenuSlug(cartItem.slug)
    );
    if (!menuItem) {
      toast.error("This item is no longer on the menu.");
      return;
    }
    if (menuItem.soldOut || !menuItem.available) {
      toast.error("This item is unavailable.");
      return;
    }
    setModalItem(menuItem);
    setEditLineKey(cartItem.lineKey);
    setModalOpen(true);
    setCartOpen(false);
  };

  const banner = closedBanner(batchCtx);
  const batchLabel = formatBatchLabel(batchCtx);

  const sortedAvailable = useMemo(
    () =>
      [...liveMenuItems]
        .filter((i) => i.available && !i.soldOut)
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "en")
        ),
    [liveMenuItems]
  );

  const popularPicks = useMemo(
    () => sortedAvailable.filter((i) => i.isFavorite),
    [sortedAvailable]
  );

  /** Full menu for “Burger for today”: all items, excluding any already shown in Popular picks to avoid duplicate cards. */
  const burgerForTodayItems = useMemo(() => {
    if (popularPicks.length === 0) return sortedAvailable;
    const favoriteIds = new Set(popularPicks.map((i) => i.id));
    return sortedAvailable.filter((i) => !favoriteIds.has(i.id));
  }, [sortedAvailable, popularPicks]);

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
          <div className="lg:col-span-7 xl:col-span-8 space-y-10 lg:space-y-12">
            {popularPicks.length > 0 ? (
              <section aria-labelledby="popular-picks-heading">
                <div className="mb-6 lg:mb-8">
                  <p className="text-section-label">Menu</p>
                  <h2
                    id="popular-picks-heading"
                    className="mt-1 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl font-display"
                  >
                    Today&apos;s Specials
                  </h2>
                  <p className="mt-2 max-w-2xl text-pretty text-sm text-charcoal/65 lg:text-base">
                    Our weekly specials, by our chef.
                  </p>
                </div>
                <div className="rounded-3xl border border-charcoal/10 bg-white/70 p-4 shadow-card sm:p-6 md:p-8 lg:rounded-[1.75rem]">
                  <FoodGrid items={popularPicks} onOpenItem={openItem} />
                </div>
              </section>
            ) : null}

            <section aria-labelledby="burger-today-heading">
              <div className="mb-6 lg:mb-8">
                <p className="text-section-label">Menu</p>
                <h2
                  id="burger-today-heading"
                  className="mt-1 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl font-display"
                >
					Order Now
                </h2>
                <p className="mt-2 max-w-2xl text-pretty text-sm text-charcoal/65 lg:text-base">
                  {popularPicks.length > 0
                    ? "The rest of today’s menu. Together with Popular picks above, this is everything available."
                    : "Tap an item to choose options and add to cart. On larger screens the cart stays visible on the right."}
                </p>
              </div>
              <div className="rounded-3xl border border-charcoal/10 bg-white/70 p-4 shadow-card sm:p-6 md:p-8 lg:rounded-[1.75rem]">
                {burgerForTodayItems.length > 0 ? (
                  <FoodGrid items={burgerForTodayItems} onOpenItem={openItem} />
                ) : popularPicks.length > 0 ? (
                  <p className="py-10 text-center text-sm text-charcoal/65">
                    Every available item is listed under Popular picks above.
                  </p>
                ) : (
                  <FoodGrid items={sortedAvailable} onOpenItem={openItem} />
                )}
              </div>
            </section>
          </div>

          <div className="hidden lg:col-span-5 xl:col-span-4 lg:block">
            <div className="lg:sticky lg:top-24">
              <p className="text-section-label-muted mb-3">Your cart</p>
              <Cart
                heading="Your cart"
                menuItems={liveMenuItems}
                onEditCartItem={openCartItemEdit}
              />
            </div>
          </div>
        </div>
      </main>

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        menuItems={liveMenuItems}
        onEditCartItem={openCartItemEdit}
      />
      <MenuItemModal
        item={modalItem}
        open={modalOpen}
        editLineKey={editLineKey}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) {
            setModalItem(null);
            setEditLineKey(null);
          }
        }}
      />
    </CustomerPageShell>
  );
}
