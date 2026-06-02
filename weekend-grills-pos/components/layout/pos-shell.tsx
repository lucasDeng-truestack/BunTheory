'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChefHat,
  CheckCircle,
  Flame,
  LogOut,
  Package,
  Boxes,
  BarChart3,
  Utensils,
  LayoutDashboard,
  Settings,
  Bell,
  Search,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandingStore } from '@/store/branding.store';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { cn } from '@/lib/utils';
import { adminAvatarInitial, adminDisplayLabel } from '@/lib/admin-display';

const ICON_COL = 'flex size-5 shrink-0 items-center justify-center';

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/order-menu', label: 'Menu', icon: Utensils },
  { href: '/kitchen-queue', label: 'Kitchen', icon: ChefHat },
  { href: '/ready-queue', label: 'Ready', icon: Bell },
  { href: '/complete-queue', label: 'Done', icon: CheckCircle },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/purchases', label: 'Purchases', icon: Package },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function navActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(href);
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const dateStr = now.toLocaleDateString('en-MY', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex tabular-nums">
      <span>{dateStr}</span>
      <span className="text-border">·</span>
      <span className="font-semibold text-foreground">{timeStr}</span>
    </div>
  );
}

export function PosShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, logout: handleLogout, admin } = useStaffAuth();
  const companyName = useBrandingStore((s) => s.companyName);
  const companyLogoUrl = useBrandingStore((s) => s.companyLogoUrl);
  const hydrateBranding = useBrandingStore((s) => s.hydrateFromStorage);
  const refreshBranding = useBrandingStore((s) => s.refresh);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    hydrateBranding();
  }, [hydrateBranding]);

  useEffect(() => {
    if (!ready) return;
    void refreshBranding();
  }, [ready, refreshBranding]);

  useEffect(() => {
    const onBrandingUpdated = () => {
      void refreshBranding();
    };
    window.addEventListener('pos-branding-updated', onBrandingUpdated);
    return () =>
      window.removeEventListener('pos-branding-updated', onBrandingUpdated);
  }, [refreshBranding]);

  if (!ready) return null;

  const userInitial = adminAvatarInitial(admin);

  return (
    <div className="pos-ui flex h-screen overflow-hidden bg-background">
      {/* ─── Desktop sidebar — charcoal pit ───────────────────── */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 shadow-[inset_-1px_0_0_rgb(249_115_22/0.08)]',
          collapsed ? 'w-[68px]' : 'w-56',
        )}
      >
        {/* Brand header */}
        <div
          className={cn(
            'border-b border-sidebar-border py-5',
            collapsed ? 'px-2' : 'px-3',
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              'flex min-w-0 items-center rounded-xl py-0.5 transition hover:opacity-90',
              collapsed ? 'justify-center' : 'gap-3',
            )}
          >
            <span
              className="shrink-0 flex items-center justify-center rounded-xl bg-bbq-grate p-1.5 shadow-inner ring-1 ring-bbq-flame/25"
              aria-hidden
            >
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-bbq-flame to-bbq-coals shadow-[0_0_12px_rgb(249_115_22/0.35)]">
                {companyLogoUrl ? (
                  <Image
                    key={companyLogoUrl}
                    src={companyLogoUrl}
                    alt=""
                    fill
                    className="object-contain p-0.5"
                    sizes="40px"
                    unoptimized
                  />
                ) : (
                  <Flame className="h-5 w-5 text-white" />
                )}
              </div>
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 flex-col items-start gap-1 text-left',
                collapsed ? 'hidden' : 'flex',
              )}
            >
              <span className="inline-flex w-fit items-center rounded-full border border-bbq-flame/40 bg-bbq-flame/15 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-bbq-flame">
                POS
              </span>
              <span className="font-display block text-sm font-bold leading-snug text-sidebar-foreground">
                {companyName}
              </span>
            </span>
          </Link>
        </div>

        {/* Primary nav */}
        <nav
          className={cn(
            'min-h-0 flex-1 space-y-0.5 overflow-y-auto py-3',
            collapsed ? 'px-2' : 'px-3',
          )}
          aria-label="POS primary"
        >
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'font-display flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors',
                  collapsed
                    ? 'justify-center px-0 py-3'
                    : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-bbq-flame/20'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <span className={ICON_COL}>
                  <Icon className="h-5 w-5 opacity-90" aria-hidden />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1',
                    collapsed && 'sr-only',
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden shrink-0 border-t border-sidebar-border lg:block">
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-lg p-2 text-sidebar-foreground/50 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronsRight className="h-5 w-5" strokeWidth={2} aria-hidden />
              ) : (
                <ChevronsLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
              )}
            </button>
          </div>
        </div>

        {/* Staff footer */}
        <div
          className={cn(
            'mt-auto border-t border-sidebar-border bg-bbq-grate/40 py-4',
            collapsed ? 'px-2' : 'px-3',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              collapsed ? 'flex-col justify-center gap-3' : 'gap-3',
            )}
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bbq-flame/20 font-display text-sm font-bold text-bbq-flame ring-2 ring-bbq-flame/30"
              aria-hidden
            >
              {userInitial}
            </div>
            <div className={cn('min-w-0 flex-1', collapsed && 'hidden')}>
              <p className="font-display truncate text-sm font-semibold text-sidebar-foreground">
                {adminDisplayLabel(admin)}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/55">
                {admin?.email}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile bottom nav — charcoal bar ─────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex md:hidden border-t border-sidebar-border bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgb(0_0_0/0.25)]">
        {PRIMARY_NAV.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = navActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors',
                active
                  ? 'text-bbq-flame'
                  : 'text-sidebar-foreground/50',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-display">{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors',
            pathname.startsWith('/settings')
              ? 'text-bbq-flame'
              : 'text-sidebar-foreground/50',
          )}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-bbq-flame/20 text-bbq-flame text-[9px] font-bold font-display ring-1 ring-bbq-flame/30">
            {userInitial}
          </div>
          <span className="font-display">More</span>
        </Link>
      </nav>

      {/* ─── Main content area ────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-border bg-card/95 px-4 py-2 shrink-0 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-bbq-flame md:hidden" />
            <span className="font-display text-base font-black text-foreground tracking-tight">
              {companyName}
            </span>
            <span className="hidden text-[10px] font-display font-semibold text-bbq-ember rounded-md border border-bbq-flame/25 bg-bbq-flame/10 px-1.5 py-0.5 sm:inline-block">
              POS
            </span>
          </div>

          <div className="relative flex-1 max-w-xs hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search…"
              className="w-full rounded-lg border border-input bg-muted/40 py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-bbq-flame/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <LiveClock />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
