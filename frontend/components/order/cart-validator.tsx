"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getMenu } from "@/services/menu.service";
import { useCartStore } from "@/store/cart.store";
import { getMenuValidityLists } from "@/lib/cart-menu-validation";
import { normalizeMenuSlug } from "@/lib/menu-slug";

interface CartValidatorProps {
  /** When true, redirect to menu if cart becomes empty after validation */
  redirectIfEmpty?: boolean;
}

/**
 * Validates cart items against the current menu.
 * Removes stale/invalid items (e.g. old menuIds in localStorage after DB reset).
 * Re-runs when the set of line identities (menuId/slug) changes, not on quantity-only updates.
 */
export function CartValidator({ redirectIfEmpty = false }: CartValidatorProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const removeInvalidItems = useCartStore((s) => s.removeInvalidItems);

  const lineIdentityKey = useMemo(
    () =>
      items
        .map((i) => i.slug ?? i.menuId ?? "")
        .sort()
        .join("|"),
    [items]
  );

  useEffect(() => {
    if (items.length === 0) return;

    let cancelled = false;

    getMenu(false)
      .then((menuItems) => {
        if (cancelled || !menuItems || menuItems.length === 0) return;

        const { validSlugs: slugList, validIds: idList } =
          getMenuValidityLists(menuItems);
        const validSlugs = new Set(slugList);
        const validIds = new Set(idList);

        const snapshot = useCartStore.getState().items;
        const invalidCount = snapshot.filter(
          (i) =>
            !(
              (i.slug && validSlugs.has(normalizeMenuSlug(i.slug))) ||
              (i.menuId && validIds.has(i.menuId))
            )
        ).length;

        if (invalidCount > 0) {
          removeInvalidItems(Array.from(validSlugs), Array.from(validIds));
          toast.warning("Cart updated", {
            description: `${invalidCount} item(s) were removed — they no longer match the menu. Add items again from the menu.`,
          });
          const after = useCartStore.getState().items;
          if (redirectIfEmpty && after.length === 0) {
            router.replace("/menu");
          }
        }
      })
      .catch(() => {
        /* network: don’t clear cart */
      });

    return () => {
      cancelled = true;
    };
  }, [lineIdentityKey, items.length, removeInvalidItems, router, redirectIfEmpty]);

  return null;
}
