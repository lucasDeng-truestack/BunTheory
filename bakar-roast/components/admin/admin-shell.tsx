"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { motion } from "motion/react";
import { ArrowLeft, Ellipsis, X } from "lucide-react";
import { adminPendingCount } from "@/lib/catering-api";
import { ordersPendingCount } from "@/lib/bun-theory-api";
import {
  clearSession,
  EXPIRED_PATH,
  isSessionGone,
  LOGIN_PATH,
  readSession,
  type AdminSession,
} from "@/lib/admin-session";
import { initials } from "@/lib/admin";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/banner";
import { StatusChip } from "@/components/ui/status-chip";
import { AdminContext, type AdminContextValue, type TopBar } from "@/components/admin/admin-context";
import { PendingBadge } from "@/components/admin/admin-page";
import { ThemeToggle } from "@/components/theme";
import { ADMIN_NAV, currentItem, isCurrent, TAB_HREFS, type AdminNavItem } from "@/components/admin/nav";

type Counts = { pending: number | null; ordersPending: number | null };

/** The badge on one menu item, or nothing. */
function NavBadge({ item, counts, className }: { item: AdminNavItem; counts: Counts; className?: string }) {
  if (item.badge === "catering") return <PendingBadge count={counts.pending} className={className} />;
  if (item.badge === "orders")
    return <PendingBadge count={counts.ordersPending} label="not delivered" className={className} />;
  return null;
}

const POLL_MS = 60_000;

/**
 * The admin frame and auth gate. `/admin/login` renders bare. Everything else waits for the
 * token (read after mount, so the server and first client render are the same skeleton), then
 * gets the sidebar on laptop, or the sticky top bar and bottom tab bar on phone.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  if (pathname === LOGIN_PATH) return <>{children}</>;
  return <Gate>{children}</Gate>;
}

function Gate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    const { session: s, ended } = readSession();
    if (s) setSession(s);
    else {
      clearSession();
      router.replace(ended ? EXPIRED_PATH : LOGIN_PATH);
    }
  }, [router]);

  return session ? <Frame session={session}>{children}</Frame> : <ShellSkeleton />;
}

function Frame({ session, children }: { session: AdminSession; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";
  const [pending, setPending] = useState<number | null>(null);
  const [ordersPending, setOrdersPending] = useState<number | null>(null);
  const [topBar, setTopBar] = useState<TopBar | null>(null);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
  const [hasActionBar, setHasActionBar] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const gone = useRef(false);

  const expire = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    clearSession();
    router.replace(EXPIRED_PATH);
  }, [router]);

  const run = useCallback(
    async <T,>(call: (token: string) => Promise<T>): Promise<T> => {
      try {
        return await call(session.token);
      } catch (err) {
        if (isSessionGone(err)) expire();
        throw err;
      }
    },
    [session.token, expire],
  );

  const refreshPending = useCallback(() => {
    if (gone.current) return;
    run(adminPendingCount).then(
      (r) => setPending(r.count),
      () => {}, // The badge keeps its last value; screens report their own failures.
    );
  }, [run]);

  const refreshOrdersPending = useCallback(() => {
    if (gone.current) return;
    run(ordersPendingCount).then(
      (r) => setOrdersPending(r.count),
      () => {},
    );
  }, [run]);

  useEffect(() => {
    const tick = () => {
      refreshPending();
      refreshOrdersPending();
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => clearInterval(t);
  }, [refreshPending, refreshOrdersPending]);

  useEffect(() => setDrawer(false), [pathname]);

  const signOut = useCallback(() => {
    gone.current = true;
    clearSession();
    router.replace(LOGIN_PATH);
  }, [router]);

  const value = useMemo<AdminContextValue>(
    () => ({
      token: session.token,
      admin: session.admin,
      pending,
      refreshPending,
      ordersPending,
      refreshOrdersPending,
      run,
      signOut,
      setTopBar,
      actionSlot,
      setHasActionBar,
    }),
    [session, pending, refreshPending, ordersPending, refreshOrdersPending, run, signOut, actionSlot],
  );
  const counts: Counts = { pending, ordersPending };

  const section = currentItem(pathname);
  // The phone header shows the count for the group you are in: requests in Catering, orders in The Bun Theory.
  const groupBadge = ADMIN_NAV.find((g) => section && g.items.includes(section))?.items.find((i) => i.badge);
  const onTab = TAB_HREFS.some((h) => isCurrent(pathname, h));

  return (
    <AdminContext.Provider value={value}>
      <div className="type-admin-body min-h-screen bg-ink">
        <aside
          data-lenis-prevent
          className="fixed inset-y-0 left-0 z-40 hidden w-64 overflow-y-auto border-r border-ink-line bg-ink-soft lg:block"
        >
          <SideNav pathname={pathname} counts={counts} session={session} onSignOut={signOut} />
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex min-h-[60px] items-center gap-3 border-b border-ink-line bg-ink px-4 py-2 pt-[max(8px,env(safe-area-inset-top))] lg:hidden">
            {topBar?.back && (
              <Link
                href={topBar.back}
                aria-label="Back"
                className="grid h-11 w-11 flex-none place-items-center rounded-full border border-cream-faint text-cream"
              >
                <ArrowLeft aria-hidden size={18} strokeWidth={1.75} />
              </Link>
            )}
            <p className="m-0 mr-auto min-w-0 truncate font-display text-2xl font-extrabold uppercase leading-none [font-stretch:80%]">
              {topBar?.title ?? section?.title ?? section?.label ?? "Admin"}
            </p>
            {topBar?.status ? <StatusChip status={topBar.status} /> : !topBar && groupBadge && <NavBadge item={groupBadge} counts={counts} />}
          </header>

          <div
            className={cn(
              "grid min-w-0 max-w-[1200px] content-start px-4 pt-5 lg:px-[clamp(16px,3vw,44px)] lg:pb-[72px] lg:pt-9",
              "pb-[calc(120px+env(safe-area-inset-bottom))]",
            )}
          >
            {children}
          </div>
        </div>

        <nav
          aria-label="Sections"
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-ink-line bg-ink-soft px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] lg:hidden",
            hasActionBar && "hidden",
          )}
        >
          {ADMIN_NAV[0].items
            .filter((i) => TAB_HREFS.includes(i.href))
            .map((item) => {
              const current = isCurrent(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative grid min-h-[52px] content-center justify-items-center gap-[3px] rounded-[12px] text-xs font-semibold no-underline",
                    current ? "bg-ink-raised text-cream" : "text-cream-muted",
                  )}
                >
                  <Icon aria-hidden size={20} strokeWidth={1.6} className={cn(current && "text-ember")} />
                  {item.label}
                  <NavBadge item={item} counts={counts} className="absolute left-[calc(50%+6px)] top-1" />
                </Link>
              );
            })}
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-current={!onTab ? "page" : undefined}
            aria-haspopup="dialog"
            className={cn(
              "grid min-h-[52px] content-center justify-items-center gap-[3px] rounded-[12px] text-xs font-semibold",
              !onTab ? "bg-ink-raised text-cream" : "text-cream-muted",
            )}
          >
            <Ellipsis aria-hidden size={20} strokeWidth={1.6} className={cn(!onTab && "text-ember")} />
            More
          </button>
        </nav>

        {/* Phone sticky action bar on a request; empty (and hidden) everywhere else. */}
        <div
          ref={setActionSlot}
          className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-ink-line bg-ink-soft px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] empty:hidden lg:hidden"
        />

        <Drawer open={drawer} onClose={() => setDrawer(false)}>
          <SideNav pathname={pathname} counts={counts} session={session} onSignOut={signOut} />
        </Drawer>
      </div>
    </AdminContext.Provider>
  );
}

function SideNav({
  pathname,
  counts,
  session,
  onSignOut,
}: {
  pathname: string;
  counts: Counts;
  session: AdminSession;
  onSignOut: () => void;
}) {
  const { admin } = session;
  return (
    <nav aria-label="Admin" className="flex min-h-full flex-1 flex-col gap-0.5 px-3 pb-4 pt-[22px]">
      <Link
        href="/admin"
        className="block px-3 py-2.5 font-display text-2xl font-extrabold uppercase leading-none text-cream no-underline [font-stretch:80%]"
      >
        Bakar <span className="text-ember">&amp;</span> Roast
      </Link>
      <p className="m-0 px-3 pb-3 text-xs text-cream-faint">Admin</p>
      {ADMIN_NAV.map((g) => (
        <div key={g.group} className="grid gap-0.5">
          <p className="type-admin-meta m-0 px-3 pb-1.5 pt-3.5 text-cream-faint">{g.group}</p>
          {g.items.map((item) => {
            const current = isCurrent(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-2 rounded-[12px] px-3 font-semibold no-underline transition-colors",
                  current
                    ? "bg-ink-raised text-cream shadow-[inset_3px_0_0_theme(colors.ember.DEFAULT)]"
                    : "text-cream-muted hover:text-cream",
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-3">
                  <Icon aria-hidden size={20} strokeWidth={1.6} className={cn("flex-none", current && "text-ember")} />
                  {item.label}
                </span>
                <NavBadge item={item} counts={counts} />
              </Link>
            );
          })}
        </div>
      ))}
      <ThemeToggle variant="row" className="mt-auto" />
      <div className="mt-1 flex items-center gap-3 border-t border-ink-line px-3 pt-3.5">
        <span
          aria-hidden
          className="grid h-10 w-10 flex-none place-items-center rounded-full border-[1.5px] border-ember text-[13px] font-bold tracking-[0.04em]"
        >
          {initials(admin.displayName, admin.email)}
        </span>
        <div className="min-w-0">
          <b className="block truncate">{admin.displayName || admin.email}</b>
          <div className="flex gap-3.5">
            <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-cream-muted underline">
              View site
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-11 items-center font-semibold text-cream-muted underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

/** The phone "More" menu: the full sidebar in a native modal dialog (focus trap, Escape). */
function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const lenis = useLenis();
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      lenis?.stop();
    } else if (!open && el.open) el.close();
  }, [open, lenis]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onNativeClose = () => lenis?.start();
    el.addEventListener("close", onNativeClose);
    return () => {
      el.removeEventListener("close", onNativeClose);
      if (el.open) lenis?.start();
    };
  }, [lenis]);

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      data-lenis-prevent
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 h-full max-h-none w-[min(300px,84vw)] max-w-none overflow-y-auto bg-ink-soft p-0 text-cream backdrop:bg-ink/70 open:backdrop:animate-fade-in lg:hidden"
    >
      {open && (
        <motion.div
          className="type-admin-body relative flex min-h-full flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="absolute right-3 top-[max(16px,env(safe-area-inset-top))] grid h-11 w-11 place-items-center rounded-full border border-cream-faint text-cream"
          >
            <X aria-hidden size={18} strokeWidth={1.75} />
          </button>
          {children}
        </motion.div>
      )}
    </dialog>
  );
}

/** While the token is read: the shell's shape with nothing in it (same on server and client). */
function ShellSkeleton() {
  return (
    <div aria-busy="true" className="min-h-screen bg-ink">
      <div className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink-line bg-ink-soft p-6 lg:grid lg:content-start lg:gap-4">
        <Skeleton className="h-7 w-40" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      <div className="lg:pl-64">
        <div className="h-[60px] border-b border-ink-line lg:hidden" />
        <div className="grid max-w-[1200px] gap-5 px-4 pt-5 lg:px-[clamp(16px,3vw,44px)] lg:pt-9">
          <Skeleton className="h-12 w-2/3 max-w-md" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}
