import { api } from "@/lib/api";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import type { MenuItem } from "@/types/menu";

/** Public storefront: published snapshot when a batch window is open. */
export async function getMenu(availableOnly = false): Promise<MenuItem[]> {
  const params = availableOnly ? "?available=true" : "";
  const items = await api<MenuItem[]>(`/menu${params}`);
  return items.map((i) => ({
    ...i,
    slug: normalizeMenuSlug(i.slug),
    price: typeof i.price === "string" ? parseFloat(i.price) : i.price,
  }));
}

/** Admin draft menu (JWT). */
export async function getDraftMenu(
  availableOnly: boolean,
  token: string
): Promise<MenuItem[]> {
  const params = availableOnly ? "?available=true" : "";
  const items = await api<MenuItem[]>(`/menu/draft${params}`, { token });
  return items.map((i) => ({
    ...i,
    slug: normalizeMenuSlug(i.slug),
    price: typeof i.price === "string" ? parseFloat(i.price) : i.price,
  }));
}
