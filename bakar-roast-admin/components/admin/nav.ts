import {
  CalendarClock,
  ChefHat,
  CalendarDays,
  House,
  Images,
  Inbox,
  LayoutDashboard,
  MessageSquareQuote,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/** Which count a menu item shows: catering requests waiting, or Bun Theory orders not yet delivered. */
export type AdminNavBadge = "catering" | "orders";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: AdminNavBadge;
  /** Phone top bar title when the menu label alone is unclear (two groups have Settings). */
  title?: string;
};

/** The admin sections, in groups. Every staff login sees the same menu (roles come later). */
export const ADMIN_NAV: { group: string; items: AdminNavItem[] }[] = [
  {
    group: "Bakar & Roast",
    items: [
      { label: "Orders", href: "/admin/shop-orders", icon: ShoppingBag, title: "Shop orders" },
      { label: "Schedule", href: "/admin/shop-schedule", icon: CalendarClock, title: "Shop schedule" },
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
    group: "Staff",
    items: [{ label: "Team", href: "/admin/team", icon: Users }],
  },
];

/**
 * Catering booking screens. Out of the menu since the site moved to online ordering, but the
 * pages still work by URL and keep their titles. Put this group back into ADMIN_NAV to show them.
 */
export const HIDDEN_NAV: { group: string; items: AdminNavItem[] }[] = [
  {
    group: "Catering",
    items: [
      { label: "Today", href: "/admin/today", icon: House },
      { label: "Requests", href: "/admin/requests", icon: Inbox, badge: "catering" },
      { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
      { label: "Packages", href: "/admin/packages", icon: Package },
      { label: "Gallery and testimonials", href: "/admin/content", icon: Images },
      { label: "Settings", href: "/admin/settings", icon: SlidersHorizontal, title: "Catering settings" },
    ],
  },
];

/** The phone tab bar: these three, then More (the full menu as a drawer). */
export const TAB_HREFS = ["/admin/shop-orders", "/admin/shop-schedule", "/admin/bun-theory/orders"];

/** Section roots that must match exactly, so a parent does not light up on its children's pages. */
const EXACT = new Set(["/admin/bun-theory"]);

export const isCurrent = (pathname: string, href: string) =>
  EXACT.has(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export const currentItem = (pathname: string) =>
  [...ADMIN_NAV, ...HIDDEN_NAV].flatMap((g) => g.items).find((i) => isCurrent(pathname, i.href));
