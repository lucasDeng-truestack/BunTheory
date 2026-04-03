import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import type { OrderItemSelectionPayload } from "@/services/orders.service";

export interface CartSelection {
  groupId: string;
  optionIds: string[];
}

export interface CartItem {
  lineKey: string;
  slug: string;
  menuId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  image?: string | null;
  remarks?: string;
  selections?: CartSelection[];
}

function buildLineKey(
  slug: string,
  selections?: CartSelection[],
  remarks?: string
): string {
  const sel = JSON.stringify(selections ?? []);
  const r = (remarks ?? "").trim();
  return `${normalizeMenuSlug(slug)}::${sel}::${r}`;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "lineKey">, quantity?: number) => void;
  /** Remove a line and add the replacement (same as editing options / remarks / price). */
  replaceItem: (
    oldLineKey: string,
    item: Omit<CartItem, "quantity" | "lineKey">,
    quantity: number
  ) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
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
          const slug = normalizeMenuSlug(item.slug);
          const lineKey = buildLineKey(slug, item.selections, item.remarks);
          const normalized: Omit<CartItem, "quantity"> = {
            ...item,
            slug,
            lineKey,
          };
          const existing = state.items.find((i) => i.lineKey === lineKey);
          const items = existing
            ? state.items.map((i) =>
                i.lineKey === lineKey
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              )
            : [...state.items, { ...normalized, quantity }];
          return { items };
        });
      },
      replaceItem: (oldLineKey, item, quantity) => {
        if (quantity <= 0) {
          get().removeItem(oldLineKey);
          return;
        }
        set((state) => {
          const rest = state.items.filter((i) => i.lineKey !== oldLineKey);
          const slug = normalizeMenuSlug(item.slug);
          const lineKey = buildLineKey(slug, item.selections, item.remarks);
          const normalized: Omit<CartItem, "quantity"> = {
            ...item,
            slug,
            lineKey,
          };
          const existing = rest.find((i) => i.lineKey === lineKey);
          const items = existing
            ? rest.map((i) =>
                i.lineKey === lineKey
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              )
            : [...rest, { ...normalized, quantity }];
          return { items };
        });
      },
      removeItem: (lineKey) =>
        set((state) => ({
          items: state.items.filter((i) => i.lineKey !== lineKey),
        })),
      updateQuantity: (lineKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineKey);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.lineKey === lineKey ? { ...i, quantity } : i
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
              slugSet.has(normalizeMenuSlug(i.slug)) ||
              (i.menuId && idSet.has(i.menuId))
          );
          return { items: kept };
        });
      },
      total: () =>
        get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "bun-theory-cart-v6",
      storage: createJSONStorage<{ items: CartItem[] }>(() => localStorage, {
        reviver: (key, value) => {
          if (key === "items" && Array.isArray(value)) {
            return (value as CartItem[]).map((i) => ({
              ...i,
              slug: normalizeMenuSlug(i.slug ?? ""),
              lineKey:
                i.lineKey ??
                buildLineKey(i.slug, i.selections, i.remarks),
            }));
          }
          return value;
        },
      }),
    }
  )
);

export function cartSelectionsToPayload(
  s?: CartSelection[]
): OrderItemSelectionPayload[] | undefined {
  if (!s?.length) return undefined;
  return s.map((x) => ({ groupId: x.groupId, optionIds: x.optionIds }));
}
