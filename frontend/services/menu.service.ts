import { api } from "@/lib/api";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import type { MenuItem } from "@/types/menu";

function normalizeMenuItem(i: MenuItem): MenuItem {
  const price =
    typeof i.price === "string" ? parseFloat(i.price) : Number(i.price);
  return {
    ...i,
    slug: normalizeMenuSlug(i.slug),
    price,
    soldOut: i.soldOut ?? false,
    soldQuantity: i.soldQuantity ?? 0,
    maxQuantity: i.maxQuantity ?? null,
    sortOrder: i.sortOrder ?? 0,
    optionGroups: (i.optionGroups ?? []).map((g) => ({
      ...g,
      options: (g.options ?? []).map((o) => ({
        ...o,
        priceDelta:
          typeof o.priceDelta === "string"
            ? parseFloat(o.priceDelta)
            : Number(o.priceDelta),
      })),
    })),
  };
}

/**
 * Public storefront menu. Pass `revalidate` (seconds) to serve it from the ISR
 * cache instead of fetching per-request — used by cached marketing pages where
 * a slightly stale preview is fine (live ordering state comes from batch-status
 * on the client).
 */
export async function getMenu(availableOnly = false, revalidate?: number): Promise<MenuItem[]> {
  const params = availableOnly ? "?available=true" : "";
  const items = await api<MenuItem[]>(
    `/menu${params}`,
    revalidate != null ? { next: { revalidate } } : undefined
  );
  return items.map(normalizeMenuItem);
}

/** Admin live menu (JWT). */
export async function getDraftMenu(
  availableOnly: boolean,
  token: string
): Promise<MenuItem[]> {
  const params = availableOnly ? "?available=true" : "";
  const items = await api<MenuItem[]>(`/menu/draft${params}`, { token });
  return items.map(normalizeMenuItem);
}

export async function createMenuItem(
  token: string,
  body: Record<string, unknown>
): Promise<MenuItem> {
  const created = await api<MenuItem>(`/menu`, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
  return normalizeMenuItem(created);
}

export async function updateMenuItem(
  token: string,
  id: string,
  body: Record<string, unknown>
): Promise<MenuItem> {
  const updated = await api<MenuItem>(`/menu/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
  return normalizeMenuItem(updated);
}

export async function deleteMenuItem(token: string, id: string): Promise<void> {
  await api(`/menu/${id}`, { method: "DELETE", token });
}
