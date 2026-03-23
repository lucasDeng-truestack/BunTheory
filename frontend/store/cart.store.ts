import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { normalizeMenuSlug } from "@/lib/menu-slug";

export interface CartItem {
  slug?: string;
  menuId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
  removeInvalidItems: (validSlugs: string[], validMenuIds?: string[]) => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        set((state) => {
          const normalized =
            item.slug != null && item.slug !== ""
              ? { ...item, slug: normalizeMenuSlug(item.slug) }
              : item;
          const key = normalized.slug ?? normalized.menuId;
          const existing = state.items.find((i) => {
            const ik = i.slug ?? i.menuId;
            return key && ik === key;
          });
          const items = existing
            ? state.items.map((i) => {
                const ik = i.slug ?? i.menuId;
                return key && ik === key
                  ? { ...i, quantity: i.quantity + quantity }
                  : i;
              })
            : [...state.items, { ...normalized, quantity }];
          return { items };
        });
      },
      removeItem: (slugOrId) =>
        set((state) => ({
          items: state.items.filter((i) => i.slug !== slugOrId && i.menuId !== slugOrId),
        })),
      updateQuantity: (slugOrId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(slugOrId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.slug === slugOrId || i.menuId === slugOrId ? { ...i, quantity } : i
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      removeInvalidItems: (validSlugs, validMenuIds = []) => {
        set((state) => {
          const slugSet = new Set(validSlugs.map((s) => normalizeMenuSlug(s)));
          const idSet = new Set(validMenuIds);
          const kept = state.items.filter(
            (i) =>
              (i.slug && slugSet.has(normalizeMenuSlug(i.slug))) ||
              (i.menuId && idSet.has(i.menuId!))
          );
          return { items: kept };
        });
      },
      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      /** Bump when cart shape changes (e.g. slug-only lines to avoid stale menuIds). */
      name: "bun-theory-cart-v5",
      storage: createJSONStorage<{ items: CartItem[] }>(() => localStorage, {
        reviver: (key, value) => {
          if (key === "items" && Array.isArray(value)) {
            return (value as CartItem[])
              .map((i): CartItem => {
                if (i.slug) {
                  const { menuId: _m, ...rest } = i;
                  return {
                    ...rest,
                    slug: normalizeMenuSlug(rest.slug ?? i.slug ?? ""),
                  };
                }
                return i;
              })
              .filter((i) => Boolean(i.slug));
          }
          return value;
        },
      }),
    }
  )
);
