import { api } from "@/lib/api";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import type { MenuItem } from "@/types/menu";

export async function getMenu(availableOnly = false): Promise<MenuItem[]> {
  const params = availableOnly ? "?available=true" : "";
  const items = await api<MenuItem[]>(`/menu${params}`);
  return items.map((i) => ({
    ...i,
    slug: normalizeMenuSlug(i.slug),
    price: typeof i.price === "string" ? parseFloat(i.price) : i.price,
  }));
}
