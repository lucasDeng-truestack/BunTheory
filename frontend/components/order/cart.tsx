"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart.store";
import { useHydrated } from "@/hooks/use-hydrated";
import { ShoppingCart, Minus, Plus } from "lucide-react";
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
}

export function Cart({
  showCheckoutButton = true,
  heading = "Your order",
  variant = "default",
}: CartProps) {
  const hydrated = useHydrated();
  const { items, updateQuantity, total, itemCount } = useCartStore();
  const isPanel = variant === "panel";

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
        <ShoppingCart className="mx-auto h-12 w-12 text-charcoal/30" />
        <p className="mt-2 font-medium text-charcoal/80">Your cart is empty</p>
        <p className="text-sm text-charcoal/50">Add items from the menu</p>
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
        {items.map((item) => (
          <div
            key={item.lineKey}
            className="flex items-center justify-between rounded-xl border border-charcoal/10 bg-cream/20 p-3"
          >
            <div className="min-w-0 pr-2">
              <p className="font-medium font-display">{item.name}</p>
              {item.remarks ? (
                <p className="text-xs text-charcoal/55 line-clamp-2">{item.remarks}</p>
              ) : null}
              <p className="text-sm text-charcoal/70">
                RM {(item.unitPrice * item.quantity).toFixed(2)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                type="button"
                onClick={() => updateQuantity(item.lineKey, item.quantity - 1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <Button
                size="icon"
                variant="ghost"
                type="button"
                onClick={() => updateQuantity(item.lineKey, item.quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-charcoal/10 pt-4">
        <span className="font-semibold text-charcoal/80 font-display">Total</span>
        <span className="text-lg font-bold text-roast-red">
          RM {total().toFixed(2)}
        </span>
      </div>
      {showCheckoutButton && (
        <Button asChild size="lg" className="w-full min-h-12 font-display">
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
