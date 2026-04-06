import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND_FULL_NAME, BRAND_SUBLINE, BRAND_TITLE_LINE } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

type CustomerPageShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Extra classes on the inner flex column (below decorative layers) */
  mainClassName?: string;
};

/** Horizontal padding for customer `main` — shell no longer applies max-width; headers are full-bleed. */
export const customerMainPaddingClass =
  "px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14";

/** Inner max width for header rows on ultra-wide screens */
export const customerHeaderInnerClass =
  "mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16";

/** Shared sticky bar chrome (home + inner pages) */
export const customerHeaderChromeClass =
  "sticky top-0 z-30 w-full overflow-hidden border-b border-charcoal/10 bg-white/97 shadow-[0_6px_32px_-12px_rgba(122,12,12,0.18),0_2px_8px_-2px_rgba(31,41,55,0.08)] backdrop-blur-lg supports-[backdrop-filter]:bg-white/92";

const customerTopNavLinkClass =
  "font-display inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-base font-medium text-charcoal/75 transition-colors hover:bg-cream hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red/35 focus-visible:ring-offset-2";

const customerTopNavPrimaryClass =
  "font-display inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-base font-semibold text-white shadow-sm transition-colors bg-roast-red hover:bg-roast-red/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red/45 focus-visible:ring-offset-2";

/**
 * Full-height customer storefront shell: full-width background; headers span the viewport.
 * Add `customerMainPaddingClass` + `flex flex-1 flex-col` to each page `main`.
 */
export function CustomerPageShell({
  children,
  className,
  mainClassName,
}: CustomerPageShellProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-[100dvh] flex-col bg-store-gradient text-charcoal pb-[env(safe-area-inset-bottom)]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(185,28,28,0.07),transparent_55%)] md:bg-[radial-gradient(ellipse_70%_50%_at_80%_0%,rgba(245,158,11,0.06),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_105%,rgba(185,28,28,0.05),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden md:block bg-store-dots opacity-40"
        aria-hidden
      />
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col",
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
 * Desktop: taller bar, stronger chrome, quick links, larger logo and title.
 */
export function CustomerTopBar({
  title,
  backHref,
  backLabel = "Back",
  right,
  centerTitle = true,
}: CustomerTopBarProps) {
  return (
    <header className={customerHeaderChromeClass}>
      <div
        className="h-1 w-full bg-gradient-to-r from-roast-red via-roast-red/90 to-amber-500/35"
        aria-hidden
      />
      <div
        className={cn(
          customerHeaderInnerClass,
          "grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 py-2.5 sm:gap-x-3 sm:py-3 md:py-3.5 lg:gap-x-6 lg:py-4"
        )}
      >
        <div className="flex min-w-0 justify-start">
          {backHref ? (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 gap-1.5 px-2 text-base sm:px-3 lg:h-11 lg:rounded-full lg:border lg:border-charcoal/12 lg:bg-white/90 lg:px-4 lg:shadow-sm lg:hover:bg-cream"
              asChild
            >
              <Link href={backHref} aria-label={backLabel}>
                <ChevronLeft className="h-5 w-5 shrink-0 lg:h-5 lg:w-5" />
                <span className="hidden sm:inline">{backLabel}</span>
              </Link>
            </Button>
          ) : (
            <span className="w-px" aria-hidden />
          )}
        </div>
        <div
          className={cn(
            "flex min-w-0 max-w-[min(100vw-7.5rem,22rem)] items-center justify-center gap-2 sm:max-w-[min(100vw-9rem,26rem)] sm:gap-2.5 md:max-w-[min(100vw-10rem,30rem)] lg:max-w-[min(100vw-12rem,34rem)] lg:gap-3",
            centerTitle ? "text-center lg:text-left" : "text-left"
          )}
        >
          <span className="shrink-0 lg:hidden" aria-hidden>
            <BrandLogo size="sm" priority />
          </span>
          <span className="hidden shrink-0 lg:block" aria-hidden>
            <BrandLogo size="md" priority />
          </span>
          <div
            className={cn(
              "flex min-w-0 flex-col gap-0.5 sm:gap-1",
              centerTitle ? "text-center lg:text-left" : "text-left"
            )}
          >
            <p className="font-display hidden text-[0.65rem] font-semibold leading-tight tracking-wide text-roast-red sm:block sm:text-xs sm:leading-tight">
              {BRAND_FULL_NAME}
            </p>
            <h1 className="font-display min-w-0 max-w-full truncate text-base font-bold leading-tight tracking-tight text-charcoal sm:text-lg md:text-xl lg:text-xl xl:text-2xl">
              {title}
            </h1>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2 lg:gap-3">
          <nav
            className="hidden items-center lg:flex"
            aria-label="Store sections"
          >
            <Link href="/menu" className={customerTopNavLinkClass}>
              Menu
            </Link>
            <Link href="/track" className={customerTopNavLinkClass}>
              Track
            </Link>
            <Link href="/order" className={customerTopNavPrimaryClass}>
              Checkout
            </Link>
          </nav>
          {right ?? <span className="w-px" aria-hidden />}
        </div>
      </div>
    </header>
  );
}

type MarketingHeaderProps = {
  className?: string;
};

/** Home / landing bar — same chrome and nav pattern as {@link CustomerTopBar}. */
export function MarketingHeader({ className }: MarketingHeaderProps) {
  return (
    <header className={cn(customerHeaderChromeClass, className)}>
      <div
        className="h-1.5 w-full bg-gradient-to-r from-deep-red via-roast-red to-accent-orange/60"
        aria-hidden
      />
      <div
        className={cn(
          customerHeaderInnerClass,
          "flex flex-col gap-3 py-2.5 sm:gap-4 sm:py-3 md:py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:py-4"
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 lg:gap-4">
          <span className="shrink-0 lg:hidden" aria-hidden>
            <BrandLogo size="sm" priority />
          </span>
          <span className="hidden shrink-0 lg:block" aria-hidden>
            <BrandLogo size="md" priority />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-black leading-tight tracking-wide text-deep-red sm:text-xl md:text-2xl lg:text-3xl xl:text-[2.125rem] xl:leading-tight">
              {BRAND_TITLE_LINE}
            </p>
            <p className="font-display mt-0.5 text-xs font-medium leading-snug text-charcoal/50 sm:text-sm lg:text-base">
              {BRAND_SUBLINE}
            </p>
          </div>
        </div>
        <nav
          className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end sm:gap-2 lg:gap-3"
          aria-label="Store"
        >
          <Link href="/menu" className={customerTopNavLinkClass}>
            Menu
          </Link>
          <Link href="/track" className={customerTopNavLinkClass}>
            Track
          </Link>
          <Link href="/order" className={customerTopNavPrimaryClass}>
            Checkout
          </Link>
        </nav>
      </div>
    </header>
  );
}
