/**
 * Server-side config for the Bakar & Roast /order flow. The packages themselves live in the
 * ShopPackage table and are edited by the owner in the admin (/admin/shop-packages). Prices are
 * authoritative on the server: the order total is always recomputed from the table, never trusted
 * from the client. Each order item snapshots the name and price so later edits never rewrite
 * past orders.
 */

/** Limits on one package, shared by the DTOs. */
export const SHOP_PACKAGE_MAX_IMAGES = 6;
export const SHOP_PACKAGE_MAX_INCLUDES = 20;
/** Packages the owner can keep, shown or hidden. Keeps the menu payload bounded. */
export const SHOP_PACKAGES_MAX = 50;

/** How the customer collects a pickup order. Exact address shared over WhatsApp. */
export const SHOP_PICKUP_AREA = 'Taman SEA, Petaling Jaya';

/**
 * Fallback availability rules, used only when no SystemSettings row exists yet. The owner edits
 * the live values (SystemSettings) and per-day overrides (ShopDay) through the admin.
 *  - `earliestDate`: official open date, the earliest a customer can be served.
 *  - `minNoticeDays`: buffer, no ordering within this many days of fulfilment.
 *  - `windowDays`: how far ahead a customer can order.
 *  - `serveStart` / `serveEnd`: default serving window, on the hour.
 *  - `ordersOpenDate`: pre-orders accepted only from this date on. Null = open now.
 */
export const SHOP_RULES_DEFAULT = {
  earliestDate: '2026-12-14',
  ordersOpenDate: null as string | null,
  minNoticeDays: 2,
  windowDays: 60,
  serveStart: '12:00',
  serveEnd: '20:00',
  slotMinutes: 60,
};

/** Slot lengths the owner can choose, in minutes. */
export const SHOP_SLOT_MINUTES = [30, 60, 90, 120] as const;

/** Hardest ceiling on the fulfilment window, to keep the availability payload bounded. */
export const SHOP_WINDOW_DAYS_MAX = 120;

/** Receipts a customer can upload to one order. */
export const SHOP_MAX_RECEIPTS = 5;
