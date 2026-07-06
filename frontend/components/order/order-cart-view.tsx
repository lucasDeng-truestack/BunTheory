"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubPageShell } from "@/components/layout/sub-page-shell";
import { FulfillmentHeader, LineItemCard, SummaryBar } from "@/components/storefront";
import { MenuItemModal } from "@/components/menu/menu-item-modal";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCartStore, type CartItem } from "@/store/cart.store";
import type { MenuItem } from "@/types/menu";
import type { PublicSystemSettings } from "@/services/storefront-settings.service";
import { getMenu } from "@/services/menu.service";
import { getCartLineOptionSummary } from "@/lib/cart-line-summary";
import { normalizeMenuSlug } from "@/lib/menu-slug";

type OrderCartViewProps = {
  settings: PublicSystemSettings | null;
};

export function OrderCartView({ settings }: OrderCartViewProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const fulfillment = useCartStore((s) => s.fulfillment);
  const total = useCartStore((s) => s.total());
  const count = useCartStore((s) => s.itemCount());
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLineKey, setEditLineKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMenu(false)
      .then((m) => {
        if (!cancelled) setMenu(m);
      })
      .catch(() => {
        /* option labels / edit just unavailable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const findMenu = (item: CartItem) =>
    menu.find(
      (m) =>
        (item.menuId && m.id === item.menuId) ||
        normalizeMenuSlug(m.slug) === normalizeMenuSlug(item.slug)
    );

  const onEdit = (item: CartItem) => {
    const m = findMenu(item);
    if (!m) {
      toast.error("This item can't be edited right now.");
      return;
    }
    if (m.soldOut || !m.available) {
      toast.error("This item is unavailable.");
      return;
    }
    setModalItem(m);
    setEditLineKey(item.lineKey);
    setModalOpen(true);
  };

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

  const empty = hydrated && items.length === 0;

  return (
    <SubPageShell
      title="Your order"
      eyebrow="Review your cart"
      backHref="/menu"
      backLabel="Menu"
      mainClassName="mx-auto w-full max-w-2xl pb-28"
    >
      <div>
        {!hydrated ? (
          <div className="space-y-3" aria-busy>
            <div className="h-20 animate-pulse rounded-2xl bg-bun-ink/5" />
            <div className="h-24 animate-pulse rounded-2xl bg-bun-ink/5" />
            <div className="h-24 animate-pulse rounded-2xl bg-bun-ink/5" />
          </div>
        ) : empty ? (
          <div className="rounded-4xl border-2 border-bun-ink bg-white p-10 text-center shadow-sticker">
            <ShoppingCart className="mx-auto h-12 w-12 text-bun-ink/30" />
            <p className="mt-3 font-display text-2xl font-bold text-bun-ink">
              Your cart is empty
            </p>
            <p className="mt-1 text-sm text-bun-ink-soft">
              Add something tasty from the menu.
            </p>
            <Button asChild variant="hero" size="lg" className="mt-5">
              <Link href="/menu">Browse the menu</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {fulfillmentHeader ? (
              <FulfillmentHeader
                type={fulfillment.type!}
                title={fulfillmentHeader.title}
                subtitle={fulfillmentHeader.subtitle}
                etaMinutes={settings?.prepTimeMinutes ?? null}
                onChange={() => router.push("/menu")}
              />
            ) : null}

            <div className="space-y-3">
              {items.map((item) => (
                <LineItemCard
                  key={item.lineKey}
                  name={item.name}
                  image={item.image}
                  optionsSummary={getCartLineOptionSummary(
                    item,
                    findMenu(item)
                  )}
                  remarks={item.remarks}
                  unitPrice={item.unitPrice}
                  quantity={item.quantity}
                  onIncrement={() =>
                    updateQuantity(item.lineKey, item.quantity + 1)
                  }
                  onDecrement={() =>
                    updateQuantity(item.lineKey, item.quantity - 1)
                  }
                  onRemove={() => removeItem(item.lineKey)}
                  onEdit={() => onEdit(item)}
                />
              ))}
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full gap-2 rounded-full border-2 border-bun-ink font-display font-semibold text-bun-ink hover:bg-bun-ink hover:text-bun-cream"
            >
              <Link href="/menu">
                <Plus className="h-4 w-4" strokeWidth={3} />
                Add more items
              </Link>
            </Button>
          </div>
        )}
      </div>

      {hydrated && !empty ? (
        <SummaryBar
          itemCount={count}
          total={total}
          label="Go to checkout"
          onClick={() => router.push("/order/confirm")}
        />
      ) : null}

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
    </SubPageShell>
  );
}
