"use client";

import Link from "next/link";
import { useAdminChrome } from "@/components/admin/admin-chrome-context";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const DEFAULT_COMPANY_NAME = "Bakar & Roast";

type AdminLayoutInnerProps = {
  children: React.ReactNode;
};

export function AdminLayoutInner({ children }: AdminLayoutInnerProps) {
  const pathname = usePathname();
  const { branding, sidebarCollapsed } = useAdminChrome();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const displayName = branding.companyName?.trim() || DEFAULT_COMPANY_NAME;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-charcoal/10 bg-white shadow-[4px_0_24px_-12px_rgba(31,41,55,0.12)] transition-[width] duration-200 ease-out lg:flex",
          sidebarCollapsed
            ? "w-[4.5rem]"
            : "w-[min(100%,18.5rem)] xl:w-[19.5rem]"
        )}
        aria-label="Admin sidebar"
      >
        <AdminSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-charcoal/10 bg-white/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90",
            "lg:hidden"
          )}
        >
          <Link
            href="/admin/dashboard"
            className="flex min-w-0 shrink items-center gap-2.5 rounded-xl py-0.5 outline-none ring-offset-2 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-roast-red"
          >
            <span
              className="shrink-0 rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-charcoal/10"
              aria-hidden
            >
              <BrandLogo
                size="sm"
                className="size-8"
                src={branding.companyLogoUrl}
                alt={displayName}
              />
            </span>
            <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
              <span className="inline-flex w-fit rounded-full bg-charcoal px-1.5 py-px font-display text-[9px] font-bold uppercase tracking-wider text-white">
                ADMIN
              </span>
              <span className="font-display max-w-[min(100%,11rem)] text-sm font-bold leading-tight text-charcoal">
                {displayName}
              </span>
            </span>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-display min-h-11 shrink-0 rounded-full border-charcoal/15 px-4"
            onClick={() => setMobileNavOpen(true)}
            aria-expanded={mobileNavOpen}
            aria-controls="admin-mobile-nav"
          >
            <Menu className="mr-2 h-4 w-4" aria-hidden />
            Menu
          </Button>
        </header>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" id="admin-mobile-nav">
            <button
              type="button"
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <div
              className="absolute inset-y-0 left-0 flex w-[min(92vw,20rem)] max-w-full flex-col bg-white shadow-elevated"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
            >
              <div className="flex items-center justify-end border-b border-charcoal/10 px-2 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <AdminSidebar onNavigate={() => setMobileNavOpen(false)} />
              </div>
            </div>
          </div>
        )}

        <main
          id="admin-main"
          className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 sm:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
