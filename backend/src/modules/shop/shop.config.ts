/**
 * Server-side config for the Bakar & Roast /order flow. The menu is not final, so packages
 * are placeholders (Package A/B/C) with placeholder prices the owner will replace. Prices are
 * authoritative here: the order total is always recomputed server-side, never trusted from the
 * client. Each order item snapshots the name and price so later edits never rewrite past orders.
 */

export type ShopPackage = {
  key: string;
  name: string;
  tagline: string;
  description: string;
  includes: string[];
  /** Fixed price, as a decimal string "88.00". Placeholder until the owner sets real prices. */
  price: string;
};

export const SHOP_PACKAGES: ShopPackage[] = [
  {
    key: 'A',
    name: 'Package A',
    tagline: 'For a small table',
    description: 'A starter spread for a small gathering.',
    includes: ['Placeholder item', 'Placeholder item'],
    price: '88.00',
  },
  {
    key: 'B',
    name: 'Package B',
    tagline: 'For the family',
    description: 'A fuller spread for the whole family.',
    includes: ['Placeholder item', 'Placeholder item', 'Placeholder item'],
    price: '128.00',
  },
  {
    key: 'C',
    name: 'Package C',
    tagline: 'For a crowd',
    description: 'The big one, built to feed a crowd.',
    includes: ['Placeholder item', 'Placeholder item', 'Placeholder item', 'Placeholder item'],
    price: '168.00',
  },
];

export const SHOP_PACKAGE_BY_KEY = new Map(SHOP_PACKAGES.map((p) => [p.key, p]));

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
};

/** Hardest ceiling on the fulfilment window, to keep the availability payload bounded. */
export const SHOP_WINDOW_DAYS_MAX = 120;

/** Receipts a customer can upload to one order. */
export const SHOP_MAX_RECEIPTS = 5;
