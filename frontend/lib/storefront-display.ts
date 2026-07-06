import { formatRM, toAmount } from "@/lib/money";
import type { MenuItem } from "@/types/menu";
import type { PublicSystemSettings } from "@/services/storefront-settings.service";

/** Last-resort product photo when a menu row has no uploaded image. */
export const DEFAULT_ITEM_IMAGE = "/images/items/Burger.webp";

/** Available, in-stock items in storefront display order. */
export function sortAvailableMenuItems(items: MenuItem[]): MenuItem[] {
  return [...items]
    .filter((i) => i.available && !i.soldOut)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "en"));
}

/** Item to spotlight in marketing hero — staff pick first, then first available. */
export function pickSpotlightItem(items: MenuItem[]): MenuItem | null {
  const available = sortAvailableMenuItems(items);
  if (available.length === 0) return null;
  return available.find((i) => i.isFavorite) ?? available[0];
}

/** Lowest list price among available items (base price only). */
export function getLowestMenuPrice(items: MenuItem[]): number | null {
  const available = sortAvailableMenuItems(items);
  if (available.length === 0) return null;
  return Math.min(...available.map((i) => toAmount(i.price)));
}

/** e.g. "From RM 10.00" — only when a real price exists. */
export function formatFromPrice(price: number | null | undefined): string | null {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  return `From ${formatRM(price)}`;
}

/** Resolve the image URL for a menu row; fallback only when the row has no image. */
export function resolveItemImage(
  item: Pick<MenuItem, "image"> | { image?: string | null } | null | undefined
): string {
  const src = item?.image?.trim();
  return src || DEFAULT_ITEM_IMAGE;
}

/** Short location line for badges — derived from outlet address, never invented. */
export function getOutletLocationLabel(
  settings: PublicSystemSettings | null | undefined
): string | null {
  const address = settings?.outletAddress?.trim();
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1];
}

/** Keep peel sticker copy readable on small badges. */
export function truncateStickerLabel(text: string, max = 22): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}
