import {
  CalendarClock,
  ChefHat,
  LayoutDashboard,
  MessageSquareQuote,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Store,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/** Which count a menu item shows: Bun Theory orders not yet delivered. */
export type AdminNavBadge = "orders";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: AdminNavBadge;
  /** Phone top bar title when the menu label alone is unclear (two groups have Settings). */
  title?: string;
  /** A link to another app (the POS). Opens in a new tab and is never the current page. */
  external?: boolean;
};

/** The Weekend Grill POS is its own app. Set NEXT_PUBLIC_POS_URL in production. */
const POS_URL = (process.env.NEXT_PUBLIC_POS_URL || "http://localhost:3011").replace(/\/+$/, "");

/** The admin sections, in groups. Every staff login sees the same menu (roles come later). */
export const ADMIN_NAV: { group: string; items: AdminNavItem[] }[] = [
  {
    group: "Bakar & Roast",
    items: [
      { label: "Orders", href: "/admin/shop-orders", icon: ShoppingBag, title: "Shop orders" },
      { label: "Schedule", href: "/admin/shop-schedule", icon: CalendarClock, title: "Shop schedule" },
      { label: "Packages", href: "/admin/shop-packages", icon: Package, title: "Shop packages" },
    ],
  },
  {
    group: "The Bun Theory",
    items: [
      { label: "Overview", href: "/admin/bun-theory", icon: LayoutDashboard, title: "The Bun Theory" },
      { label: "Live board", href: "/admin/bun-theory/board", icon: ChefHat },
      { label: "Orders", href: "/admin/bun-theory/orders", icon: ShoppingBag, badge: "orders" },
      { label: "Receipts", href: "/admin/bun-theory/receipts", icon: Receipt },
      { label: "Batches", href: "/admin/bun-theory/batches", icon: CalendarClock },
      { label: "Menu", href: "/admin/bun-theory/menu", icon: UtensilsCrossed },
      { label: "Feedback", href: "/admin/bun-theory/feedback", icon: MessageSquareQuote },
      { label: "Settings", href: "/admin/bun-theory/settings", icon: Settings, title: "Bun Theory settings" },
    ],
  },
  {
    group: "Weekend Grill",
    items: [{ label: "Open POS", href: POS_URL, icon: Store, external: true }],
  },
  {
    group: "Staff",
    items: [{ label: "Team", href: "/admin/team", icon: Users }],
  },
];

/** The phone tab bar: these three, then More (the full menu as a drawer). */
export const TAB_HREFS = ["/admin/shop-orders", "/admin/shop-schedule", "/admin/bun-theory/orders"];

/** Section roots that must match exactly, so a parent does not light up on its children's pages. */
const EXACT = new Set(["/admin/bun-theory"]);

export const isCurrent = (pathname: string, href: string) =>
  EXACT.has(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export const currentItem = (pathname: string) =>
  ADMIN_NAV.flatMap((g) => g.items).find((i) => isCurrent(pathname, i.href));
