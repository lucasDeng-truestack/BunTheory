import type { CartItem } from "@/store/cart.store";
import type { MenuItem } from "@/types/menu";

/** Short human-readable summary of chosen options for a cart line (needs live menu). */
export function getCartLineOptionSummary(
  item: CartItem,
  menu: MenuItem | undefined
): string | null {
  if (!menu?.optionGroups?.length || !item.selections?.length) return null;
  const parts: string[] = [];
  for (const sel of item.selections) {
    const g = menu.optionGroups.find((x) => x.id === sel.groupId);
    if (!g) continue;
    const labels = sel.optionIds
      .map((oid) => g.options.find((o) => o.id === oid)?.label)
      .filter((x): x is string => Boolean(x?.trim()));
    if (labels.length) parts.push(labels.join(", "));
  }
  return parts.length ? parts.join(" · ") : null;
}
