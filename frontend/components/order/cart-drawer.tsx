"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Cart } from "@/components/order/cart";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/store/cart.store";
import type { MenuItem } from "@/types/menu";
import { X } from "lucide-react";

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItems?: MenuItem[];
  onEditCartItem?: (item: CartItem) => void;
};

/**
 * Mobile bottom sheet: cart contents + checkout. Uses Radix Dialog for a11y + focus trap.
 */
export function CartDrawer({
  open,
  onOpenChange,
  menuItems,
  onEditCartItem,
}: CartDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        position="bottom"
        className="flex max-h-[min(90vh,900px)] flex-col gap-0 p-0"
      >
        <div className="shrink-0 border-b border-charcoal/10 px-4 pb-3 pt-3">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-charcoal/15" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-left text-lg font-semibold">
                Your cart
              </DialogTitle>
              <DialogDescription className="sr-only">
                Review your items, adjust quantities, then proceed to checkout.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-xl"
              onClick={() => onOpenChange(false)}
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <Cart
            variant="panel"
            heading="Your cart"
            showCheckoutButton
            menuItems={menuItems}
            onEditCartItem={onEditCartItem}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
