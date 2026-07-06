"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore, type CartItem } from "@/store/cart.store";
import type { MenuItem } from "@/types/menu";
import { getCartLineOptionSummary } from "@/lib/cart-line-summary";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import { useHydrated } from "@/hooks/use-hydrated";
import { getMenu } from "@/services/menu.service";
import { ShoppingCart, Minus, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface CartProps {
  /** When false, hides the Checkout button (e.g. when already on checkout page) */
  showCheckoutButton?: boolean;
  /** Section title above line items */
  heading?: string;
  /**
   * `default` — full card (sidebar / checkout).
   * `panel` — compact body for bottom sheet / embedded layouts.
   */
  variant?: "default" | "panel";
  /** When set with `menuItems`, shows an Edit control and option summaries on each line. */
  menuItems?: MenuItem[];
  onEditCartItem?: (item: CartItem) => void;
}

export function Cart({
  showCheckoutButton = true,
  heading = "Your order",
  variant = "default",
  menuItems,
  onEditCartItem,
}: CartProps) {
  const hydrated = useHydrated();
  const { items, updateQuantity, total, itemCount } = useCartStore();
  const isPanel = variant === "panel";

  /** Load menu to resolve add-on labels when the parent does not pass `menuItems` (e.g. legacy). */
  const [fetchedMenu, setFetchedMenu] = useState<MenuItem[] | undefined>(undefined);
  const selectionsIdentity = useMemo(
    () =>
      items
        .map((i) => `${i.lineKey}:${JSON.stringify(i.selections ?? [])}`)
        .join("|"),
    [items]
  );
  useEffect(() => {
    if (menuItems !== undefined) {
      setFetchedMenu(undefined);
      return;
    }
    const cartItems = useCartStore.getState().items;
    const needsLabels = cartItems.some((i) => (i.selections?.length ?? 0) > 0);
    if (!needsLabels) {
      setFetchedMenu(undefined);
      return;
    }
    let cancelled = false;
    void getMenu(false).then((m) => {
      if (!cancelled) setFetchedMenu(m);
    });
    return () => {
      cancelled = true;
    };
  }, [menuItems, selectionsIdentity]);
  const resolvedMenuItems = menuItems ?? fetchedMenu;

  if (!hydrated) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-charcoal/10 bg-white p-4 shadow-card sm:p-5",
          isPanel && "border-0 bg-transparent p-0 shadow-none"
        )}
        aria-busy
      >
        {!isPanel && (
          <div className="mb-4 h-6 w-28 rounded-md bg-charcoal/10 animate-pulse" />
        )}
        <div className="space-y-3">
          <div className="h-16 rounded-xl bg-charcoal/5 animate-pulse" />
          <div className="h-16 rounded-xl bg-charcoal/5 animate-pulse" />
        </div>
        <div className="mt-4 flex justify-between border-t border-charcoal/10 pt-4">
          <div className="h-5 w-12 rounded bg-charcoal/10 animate-pulse" />
          <div className="h-6 w-20 rounded bg-charcoal/10 animate-pulse" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "text-center",
          !isPanel &&
            "rounded-2xl border border-charcoal/10 bg-white p-8 shadow-card",
          isPanel && "py-6"
        )}
      >
        <ShoppingCart className="mx-auto h-12 w-12 text-bun-ink/30" />
        <p className="mt-2 font-display font-bold text-bun-ink">Your cart is empty</p>
        <p className="text-sm text-bun-ink-soft">Add items from the menu</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-4",
        !isPanel &&
          "rounded-2xl border border-charcoal/10 bg-white p-4 shadow-card sm:p-5",
        isPanel && "px-1 pb-1 pt-0"
      )}
    >
      {!isPanel && (
        <h2 className="text-lg font-semibold tracking-tight font-display">{heading}</h2>
      )}
      <div className="space-y-3">
        {items.map((item) => {
          const menu = resolvedMenuItems?.find(
            (m) =>
              (item.menuId && m.id === item.menuId) ||
              normalizeMenuSlug(m.slug) === normalizeMenuSlug(item.slug)
          );
          const optionSummary = menu
            ? getCartLineOptionSummary(item, menu)
            : null;
          return (
            <div
              key={item.lineKey}
              className="flex items-start justify-between gap-2 rounded-2xl border-2 border-bun-ink/12 bg-bun-cream-soft p-3"
            >
              <div className="min-w-0 flex-1 pr-1">
                <p className="font-display font-bold leading-snug text-bun-ink">{item.name}</p>
                {optionSummary ? (
                  <p className="mt-0.5 text-xs leading-snug text-bun-ink-soft">
                    <span className="font-semibold text-bun-ink/75">Add-ons: </span>
                    {optionSummary}
                  </p>
                ) : null}
                {item.remarks ? (
                  <p className="mt-0.5 text-xs text-bun-ink-soft/70 line-clamp-3">
                    <span className="font-semibold text-bun-ink/65">Note:</span>{" "}
                    {item.remarks}
                  </p>
                ) : null}
                <p className="mt-1 font-display text-sm font-bold text-bun-red">
                  RM {(item.unitPrice * item.quantity).toFixed(2)}
                </p>
                {onEditCartItem ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1.5 h-8 gap-1 px-2 font-display text-xs text-bun-red hover:bg-bun-red/10 hover:text-bun-red"
                    onClick={() => onEditCartItem(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit options
                  </Button>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    type="button"
                    className="h-9 w-9"
                    onClick={() => updateQuantity(item.lineKey, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[2rem] text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    type="button"
                    className="h-9 w-9"
                    onClick={() => updateQuantity(item.lineKey, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t-2 border-bun-ink/10 pt-4">
        <span className="font-display font-bold text-bun-ink">Total</span>
        <span className="font-display text-xl font-bold text-bun-red">
          RM {total().toFixed(2)}
        </span>
      </div>
      {showCheckoutButton && (
        <Button asChild variant="hero" size="lg" className="w-full min-h-12">
          <Link href="/order">
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isPanel ? (
              <>
                Proceed to checkout ({itemCount()}{" "}
                {itemCount() === 1 ? "item" : "items"})
              </>
            ) : (
              <>Checkout ({itemCount()} items)</>
            )}
          </Link>
        </Button>
      )}
    </div>
  );
}
