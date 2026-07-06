"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useHydrated } from "@/hooks/use-hydrated";
import { FoodGrid } from "@/components/menu/food-grid";
import { MenuItemModal } from "@/components/menu/menu-item-modal";
import { OrderCounter } from "@/components/order/order-counter";
import { CartDrawer } from "@/components/order/cart-drawer";
import { SiteNav } from "@/components/layout/site-nav";
import { JumpingText } from "@/components/brand/jumping-text";
import { WaveDivider } from "@/components/layout/wave-divider";
import {
  BatchBandView,
  deriveBatchDisplay,
} from "@/components/storefront/batch-status";
import { FulfillmentHeader, FulfillmentGate, SummaryBar } from "@/components/storefront";
import { useFlyToCart } from "@/components/menu/fly-to-cart";
import { useCartStore, type CartItem } from "@/store/cart.store";
import { formatRM } from "@/lib/money";
import type { MenuItem } from "@/types/menu";
import type { PublicSystemSettings } from "@/services/storefront-settings.service";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import { getMenu } from "@/services/menu.service";
import { getCanOrder, type CanOrderResponse } from "@/services/orders.service";
import { formatBatchLabel } from "@/lib/batch-display";

const UNCATEGORISED = "More items";

type PendingMenuAction =
  | { kind: "open"; item: MenuItem }
  | { kind: "add"; item: MenuItem; rect: DOMRect };

type MenuPageViewProps = {
  menuItems: MenuItem[];
  canOrder: CanOrderResponse;
  settings: PublicSystemSettings | null;
};

export function MenuPageView({ menuItems, canOrder, settings }: MenuPageViewProps) {
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLineKey, setEditLineKey] = useState<string | null>(null);
  const [liveMenuItems, setLiveMenuItems] = useState(menuItems);
  const [batchCtx, setBatchCtx] = useState(canOrder);
  const [menuRefreshError, setMenuRefreshError] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateConfirmedThisVisit, setGateConfirmedThisVisit] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingMenuAction | null>(null);
  const hydrated = useHydrated();
  const { registerTarget, fly } = useFlyToCart();
  const count = useCartStore((s) => s.itemCount());
  const cartTotal = useCartStore((s) => s.total());
  const fulfillment = useCartStore((s) => s.fulfillment);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    setBatchCtx(canOrder);
  }, [canOrder]);

  // Fresh menu visit with an empty cart: confirm delivery vs pickup before browsing.
  useEffect(() => {
    if (!hydrated || gateConfirmedThisVisit || count > 0) return;
    setGateOpen(true);
  }, [hydrated, gateConfirmedThisVisit, count]);

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

  const openItemNow = (item: MenuItem) => {
    if (item.soldOut || !item.available) return;
    setEditLineKey(null);
    setModalItem(item);
    setModalOpen(true);
  };

  const addItemNow = (item: MenuItem, rect: DOMRect) => {
    if (item.soldOut || !item.available) return;
    if (item.optionGroups.length > 0) {
      openItemNow(item);
      return;
    }
    addItem(
      {
        slug: normalizeMenuSlug(item.slug),
        menuId: item.id,
        name: item.name,
        unitPrice: item.price,
        image: item.image,
      },
      1
    );
    fly({ src: item.image, from: rect });
    toast.success("Added to cart", { description: `${item.name} · ${formatRM(item.price)}` });
  };

  const resumePendingAction = () => {
    const pending = pendingAction;
    if (!pending) return;
    setPendingAction(null);
    if (pending.kind === "open") {
      openItemNow(pending.item);
    } else {
      addItemNow(pending.item, pending.rect);
    }
  };

  const requireFulfillment = (action: PendingMenuAction): boolean => {
    if (!hydrated) return false;
    if (fulfillment.type && gateConfirmedThisVisit) return true;
    setPendingAction(action);
    setGateOpen(true);
    return false;
  };

  const openItem = (item: MenuItem) => {
    if (item.soldOut || !item.available) return;
    if (!requireFulfillment({ kind: "open", item })) return;
    openItemNow(item);
  };

  /**
   * "+" quick-add: items with no option groups drop straight into the cart with
   * the fly-to-cart animation; customisable items open the modal (which flies on
   * its own add). Keeps required-option selection intact.
   */
  const handleCardAdd = (item: MenuItem, rect: DOMRect) => {
    if (item.soldOut || !item.available) return;
    if (!requireFulfillment({ kind: "add", item, rect })) return;
    addItemNow(item, rect);
  };

  const handleGateConfirmed = () => {
    setGateConfirmedThisVisit(true);
    resumePendingAction();
  };

  const handleGateDismiss = () => {
    setPendingAction(null);
    if (!useCartStore.getState().fulfillment.type) {
      router.push("/");
      return;
    }
    setGateConfirmedThisVisit(true);
  };

  const menuLocked = !hydrated || (count === 0 && !gateConfirmedThisVisit);

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

  const display = deriveBatchDisplay({ status: batchCtx, loading: false });
  const batchLabel = formatBatchLabel(batchCtx);

  const sortedAvailable = useMemo(
    () =>
      [...liveMenuItems]
        .filter((i) => i.available && !i.soldOut)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "en")),
    [liveMenuItems]
  );

  const popularPicks = useMemo(
    () => sortedAvailable.filter((i) => i.isFavorite),
    [sortedAvailable]
  );

  /** Non-favorite items grouped by category (favorites live in "Today's Specials"). */
  const categorySections = useMemo(() => {
    const favoriteIds = new Set(popularPicks.map((i) => i.id));
    const rest = sortedAvailable.filter((i) => !favoriteIds.has(i.id));
    const groups = new Map<string, MenuItem[]>();
    for (const item of rest) {
      const key = item.category?.trim() || UNCATEGORISED;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === UNCATEGORISED) return 1;
      if (b === UNCATEGORISED) return -1;
      return a.localeCompare(b, "en");
    });
  }, [sortedAvailable, popularPicks]);

  const fulfillmentHeader =
    hydrated && fulfillment.type
      ? fulfillment.type === "DELIVERY"
        ? {
            title: fulfillment.deliveryAddress || "Delivery",
            subtitle: fulfillment.deliveryNotes || null,
          }
        : {
            title: settings?.outletName?.trim() || "Pickup",
            subtitle: settings?.outletAddress?.trim() || null,
          }
      : null;

  return (
    <div className="page-shell flex min-h-[100dvh] flex-col bg-bun-cream">
      <SiteNav
        right={
          <button
            ref={registerTarget}
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={hydrated && count > 0 ? `Open cart, ${count} items` : "Open cart"}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-bun-ink bg-white text-bun-ink shadow-sticker transition-transform active:scale-95"
          >
            <ShoppingCart className="h-5 w-5" />
            {hydrated && count > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-bun-ink bg-bun-red px-1 font-display text-xs font-bold leading-none text-white">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </button>
        }
      />

      <BatchBandView d={display} showCta={false} />

      {/* ─────────────────────────── MENU HERO ─────────────────────────── */}
      <section className="relative overflow-hidden bg-ink-section px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="text-center lg:text-left">
            <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-yellow">
              {display.isOpen ? "Ordering is live" : "Browse the menu"}
            </p>
            <div className="relative inline-block max-w-full overflow-hidden">
              <h1 className="max-w-full font-display text-6xl font-bold leading-[0.85] tracking-tight text-bun-cream sm:text-7xl lg:text-8xl">
                <span className="inline-flex flex-wrap items-baseline justify-center gap-x-[0.28em] lg:justify-start">
                  <JumpingText text="THE" delay={0.1} />
                  <JumpingText text="MENU" delay={0.32} className="text-bun-yellow" />
                </span>
              </h1>
              <span
                className="pointer-events-none absolute -right-1 -top-3 hidden select-none font-display text-6xl font-bold leading-[0.85] tracking-tight text-outline-cream opacity-20 sm:block sm:text-7xl lg:text-8xl"
                aria-hidden
              >
                THE MENU
              </span>
            </div>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-bun-cream/80 lg:mx-0">
              Fire-roasted, made to order. Tap any item to customise and add it to your cart.
            </p>
          </div>

          <div className="mx-auto w-full max-w-sm space-y-3 lg:mx-0">
            {fulfillmentHeader ? (
              <FulfillmentHeader
                type={fulfillment.type!}
                title={fulfillmentHeader.title}
                subtitle={fulfillmentHeader.subtitle}
                etaMinutes={settings?.prepTimeMinutes ?? null}
                onChange={() => setGateOpen(true)}
              />
            ) : null}
            <OrderCounter
              current={batchCtx.current}
              max={batchCtx.max}
              canOrder={batchCtx.canOrder}
              batchLabel={batchLabel}
              tone="dark"
            />
          </div>
        </div>
      </section>

      <WaveDivider fill="cream" className="bg-bun-black" />

      {/* ─────────────────────────── MENU GRID ─────────────────────────── */}
      <main
        className={`flex-1 px-4 pb-32 pt-10 sm:px-6 lg:pb-16${menuLocked ? " pointer-events-none opacity-60" : ""}`}
        aria-hidden={menuLocked}
      >
        <div className="mx-auto w-full max-w-[1200px] space-y-14">
          {menuRefreshError && (
            <p className="rounded-2xl border-2 border-bun-ink/15 bg-bun-cream-soft px-4 py-3 text-center text-sm font-medium text-bun-ink-soft">
              Showing the last saved menu — we couldn&apos;t reach the kitchen to refresh.
            </p>
          )}

          {popularPicks.length > 0 ? (
            <section aria-labelledby="popular-picks-heading">
              <div className="mb-7">
                <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-red-deep">
                  Today&apos;s specials
                </p>
                <h2
                  id="popular-picks-heading"
                  className="mt-1 font-display text-4xl font-bold tracking-tight text-bun-ink sm:text-5xl"
                >
                  Chef&apos;s picks
                </h2>
              </div>
              <FoodGrid
                items={popularPicks}
                onOpenItem={openItem}
                onAddItem={handleCardAdd}
                priorityFirst
              />
            </section>
          ) : null}

          {categorySections.map(([category, items], idx) => (
            <section key={category} aria-label={category}>
              <div className="mb-7">
                <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-red-deep">
                  Menu
                </p>
                <h2 className="mt-1 font-display text-4xl font-bold tracking-tight text-bun-ink sm:text-5xl">
                  {category}
                </h2>
              </div>
              <FoodGrid
                items={items}
                onOpenItem={openItem}
                onAddItem={handleCardAdd}
                priorityFirst={popularPicks.length === 0 && idx === 0}
              />
            </section>
          ))}

          {sortedAvailable.length === 0 ? (
            <div className="rounded-4xl border-2 border-bun-ink bg-white p-10 text-center shadow-sticker">
              <p className="font-display text-2xl font-bold text-bun-ink">
                No items available right now
              </p>
              <p className="mt-2 text-sm text-bun-ink-soft">
                Check back soon — the kitchen may be updating the menu.
              </p>
            </div>
          ) : null}
        </div>
      </main>

      {/* Floating cart FAB → "Your order" screen. */}
      {hydrated ? (
        <SummaryBar
          itemCount={count}
          total={cartTotal}
          label="View order"
          onClick={() => router.push("/order")}
        />
      ) : null}

      <FulfillmentGate
        open={gateOpen}
        onOpenChange={setGateOpen}
        settings={settings}
        onConfirmed={handleGateConfirmed}
        onDismiss={handleGateDismiss}
      />

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
    </div>
  );
}
