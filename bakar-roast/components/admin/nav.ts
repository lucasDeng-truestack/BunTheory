import { CalendarDays, House, Images, Inbox, Package, SlidersHorizontal, type LucideIcon } from "lucide-react";

export type AdminNavItem = { label: string; href: string; icon: LucideIcon; pendingBadge?: boolean };

/**
 * The admin sections, in groups so more can join. The Bun Theory screens (Orders, Menu,
 * Batches, Payments) arrive later as a second group; do not list them until they exist.
 */
export const ADMIN_NAV: { group: string; items: AdminNavItem[] }[] = [
  {
    group: "Catering",
    items: [
      { label: "Today", href: "/admin", icon: House },
      { label: "Requests", href: "/admin/requests", icon: Inbox, pendingBadge: true },
      { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
      { label: "Packages", href: "/admin/packages", icon: Package },
      { label: "Gallery and testimonials", href: "/admin/content", icon: Images },
      { label: "Settings", href: "/admin/settings", icon: SlidersHorizontal },
    ],
  },
];

/** The phone tab bar: these three, then More (the full menu as a drawer). */
export const TAB_HREFS = ["/admin", "/admin/requests", "/admin/calendar"];

export const isCurrent = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

export const currentItem = (pathname: string) =>
  ADMIN_NAV.flatMap((g) => g.items).find((i) => isCurrent(pathname, i.href));
