import type { MenuItem } from "@/types/menu";
import { normalizeMenuSlug } from "@/lib/menu-slug";

/**
 * Lists used to keep cart lines that still exist on the menu.
 * Includes **all** menu rows (available or not) so we only drop lines whose
 * menuId/slug no longer exists (e.g. after re-seed), not sold-out items.
 * Checkout still enforces availability on the server.
 */
export function getMenuValidityLists(menuItems: MenuItem[]) {
  const validIds = menuItems.map((m) => m.id);
  const validSlugs = menuItems.map((m) => normalizeMenuSlug(m.slug));
  return { validIds, validSlugs };
}

export function isCartLineOnMenu(
  line: { slug?: string; menuId?: string },
  menuItems: MenuItem[]
): boolean {
  const { validIds, validSlugs } = getMenuValidityLists(menuItems);
  const idSet = new Set(validIds);
  const slugSet = new Set(validSlugs);
  const lineSlug = line.slug ? normalizeMenuSlug(line.slug) : "";
  return (
    (Boolean(lineSlug) && slugSet.has(lineSlug)) ||
    (Boolean(line.menuId) && idSet.has(line.menuId!))
  );
}
