import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

type CustomerPageShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Extra wrapper for main content (max width, padding) */
  mainClassName?: string;
};

/**
 * Full-height customer storefront shell: consistent background and safe area.
 */
export function CustomerPageShell({
  children,
  className,
  mainClassName,
}: CustomerPageShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-store-gradient text-charcoal pb-[env(safe-area-inset-bottom)]",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6",
          mainClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

type CustomerTopBarProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
  /** Right slot (e.g. cart link) */
  right?: React.ReactNode;
  /** When true, left shows spacer if no back link (keeps title centered) */
  centerTitle?: boolean;
};

/**
 * Sticky app-style header: optional back, centered title, optional trailing action.
 */
export function CustomerTopBar({
  title,
  backHref,
  backLabel = "Back",
  right,
  centerTitle = true,
}: CustomerTopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-charcoal/10 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-3">
        <div className="flex min-w-0 justify-start">
          {backHref ? (
            <Button variant="ghost" size="sm" className="-ml-2 gap-1 px-2" asChild>
              <Link href={backHref} aria-label={backLabel}>
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">{backLabel}</span>
              </Link>
            </Button>
          ) : (
            <span className="w-px" aria-hidden />
          )}
        </div>
        <div
          className={cn(
            "flex min-w-0 max-w-[min(100vw-8rem,22rem)] items-center justify-center gap-2",
            centerTitle && "text-center"
          )}
        >
          <span className="shrink-0" aria-hidden>
            <BrandLogo size="xs" priority />
          </span>
          <h1 className="min-w-0 truncate text-base font-bold tracking-tight text-charcoal">
            {title}
          </h1>
        </div>
        <div className="flex min-w-0 justify-end">{right ?? <span className="w-px" aria-hidden />}</div>
      </div>
    </header>
  );
}

type MarketingHeaderProps = {
  className?: string;
};

/** Compact brand bar for the home / landing route (no admin link). */
export function MarketingHeader({ className }: MarketingHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-charcoal/10 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80",
        className
      )}
    >
      <div className="flex items-center gap-3 py-3 sm:py-4">
        <BrandLogo size="md" priority className="shrink-0" />
        <div className="min-w-0">
          <p className="text-lg font-bold text-roast-red">Bun Theory</p>
          <p className="text-sm text-charcoal/60">by Bakar & Roast</p>
        </div>
      </div>
    </header>
  );
}
