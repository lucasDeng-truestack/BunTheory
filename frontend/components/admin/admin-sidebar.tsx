"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAdminChrome } from "@/components/admin/admin-chrome-context";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  LogOut,
  CalendarClock,
  ExternalLink,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_FULL_NAME } from "@/lib/brand";
import { BrandLogo } from "@/components/brand/brand-logo";

const DEFAULT_COMPANY_NAME = BRAND_FULL_NAME;

const ICON_COL = "flex size-5 shrink-0 items-center justify-center";

const PRIMARY_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/batches", label: "Batches", icon: CalendarClock },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

type AdminSidebarProps = {
  /** Called after a nav link is activated (e.g. close mobile drawer). */
  onNavigate?: () => void;
  className?: string;
};

function navActive(pathname: string, href: string) {
  if (href === "/admin/orders") {
    return (
      pathname === "/admin/orders" || pathname.startsWith("/admin/orders/")
    );
  }
  if (href === "/admin/settings") {
    return (
      pathname === "/admin/settings" ||
      pathname.startsWith("/admin/settings/")
    );
  }
  return pathname === href;
}

export function AdminSidebar({ onNavigate, className }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    branding,
    sidebarCollapsed,
    toggleSidebar,
    pendingOrdersCount,
  } = useAdminChrome();

  const displayName = branding.companyName?.trim() || DEFAULT_COMPANY_NAME;
  const logoSrc = branding.companyLogoUrl;

  const handleExit = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
    }
    onNavigate?.();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col bg-white", className)}
    >
      <div
        className={cn(
          "border-b border-charcoal/10 py-5 lg:py-6",
          sidebarCollapsed ? "px-2" : "px-3"
        )}
      >
        <Link
          href="/admin/dashboard"
          onClick={onNavigate}
          className={cn(
            "flex min-w-0 items-center rounded-xl py-0.5 outline-none ring-offset-2 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-roast-red",
            sidebarCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <span
            className="shrink-0 rounded-xl bg-white p-1 shadow-sm ring-1 ring-charcoal/10"
            aria-hidden
          >
            <BrandLogo
              size="md"
              className="size-11 lg:size-12"
              src={logoSrc}
              alt={displayName}
            />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 flex-col items-start gap-1.5 text-left",
              sidebarCollapsed ? "hidden" : "flex"
            )}
          >
            <span className="inline-flex w-fit items-center rounded-full bg-charcoal px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-white">
              ADMIN
            </span>
            <span className="font-display block whitespace-normal break-words text-balance text-base font-bold leading-snug text-charcoal sm:text-lg">
              {displayName}
            </span>
          </span>
        </Link>
      </div>

      <nav
        className={cn(
          "min-h-0 flex-1 space-y-1 overflow-y-auto py-4",
          sidebarCollapsed ? "px-2" : "px-3"
        )}
        aria-label="Admin primary"
      >
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = navActive(pathname, href);
          const showOrdersBadge =
            href === "/admin/orders" && pendingOrdersCount > 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={
                sidebarCollapsed
                  ? href === "/admin/orders" && pendingOrdersCount > 0
                    ? `${label} (${pendingOrdersCount} not delivered)`
                    : label
                  : undefined
              }
              className={cn(
                "font-display flex min-h-11 items-center rounded-xl text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red focus-visible:ring-offset-2",
                sidebarCollapsed
                  ? "justify-center px-0 py-3"
                  : "gap-3 px-3 py-2.5",
                active
                  ? "bg-roast-red text-white shadow-sm"
                  : "text-charcoal/70 hover:bg-cream/80 hover:text-charcoal"
              )}
            >
              <span className={cn(ICON_COL, "relative")}>
                <Icon className="h-5 w-5 opacity-90" aria-hidden />
                {showOrdersBadge && sidebarCollapsed ? (
                  <span
                    className={cn(
                      "absolute -right-1.5 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 font-display text-[10px] font-bold leading-none shadow-sm ring-2",
                      active
                        ? "bg-white text-roast-red ring-white/90"
                        : "bg-roast-red text-white ring-white"
                    )}
                    aria-hidden
                  >
                    {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-between gap-2",
                  sidebarCollapsed && "sr-only"
                )}
              >
                <span className="min-w-0">{label}</span>
                {showOrdersBadge && !sidebarCollapsed ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 font-display text-xs font-bold tabular-nums",
                      active
                        ? "bg-white/25 text-white"
                        : "bg-roast-red/15 text-roast-red"
                    )}
                  >
                    {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse / expand — reference-style strip above footer blocks; desktop only */}
      <div className="hidden shrink-0 border-t border-charcoal/10 lg:block">
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg p-2 text-charcoal/55 transition hover:bg-cream hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red focus-visible:ring-offset-2"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-5 w-5" strokeWidth={2} aria-hidden />
            ) : (
              <ChevronsLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-charcoal/10 py-3",
          sidebarCollapsed ? "px-2" : "px-3"
        )}
      >
        <p
          className={cn(
            "font-display mb-2 px-0 text-xs font-semibold uppercase tracking-wide text-charcoal/45 transition-[opacity,visibility] duration-200",
            sidebarCollapsed && "sr-only"
          )}
        >
          Other
        </p>
        <div className="space-y-1">
          <Link
            href="/"
            onClick={onNavigate}
            title={sidebarCollapsed ? "View storefront" : undefined}
            className={cn(
              "font-display flex min-h-10 items-center rounded-xl text-sm font-medium text-charcoal/70 transition-colors hover:bg-cream/80 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red focus-visible:ring-offset-2",
              sidebarCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2"
            )}
          >
            <span className={ICON_COL}>
              <ExternalLink className="h-4 w-4" aria-hidden />
            </span>
            <span className={cn("min-w-0 flex-1", sidebarCollapsed && "sr-only")}>
              View storefront
            </span>
          </Link>
        </div>
      </div>

      <div
        className={cn(
          "mt-auto border-t border-charcoal/10 bg-cream/25 py-4",
          sidebarCollapsed ? "px-2" : "px-3"
        )}
      >
        <div
          className={cn(
            "flex items-center",
            sidebarCollapsed ? "flex-col justify-center gap-3" : "gap-3"
          )}
        >
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-roast-red/15 font-display text-sm font-bold text-roast-red ring-2 ring-roast-red/20"
            aria-hidden
          >
            BT
          </div>
          <div
            className={cn("min-w-0 flex-1", sidebarCollapsed && "hidden")}
          >
            <p className="font-display truncate text-sm font-semibold text-charcoal">
              Staff
            </p>
            <p className="truncate text-xs text-charcoal/60">Admin</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full text-charcoal/70 hover:text-charcoal"
            onClick={handleExit}
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
