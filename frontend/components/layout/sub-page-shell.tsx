import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SiteNav } from "@/components/layout/site-nav";
import { cn } from "@/lib/utils";

type SubPageShellProps = {
  title: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  /** Right slot in the nav (e.g. cart button). */
  navRight?: React.ReactNode;
  children: React.ReactNode;
  /** Extra classes for the <main> (e.g. bottom padding for a fixed action bar). */
  mainClassName?: string;
  /** Hide the dark page-header band (rare — some pages own their hero). */
  hideHeader?: boolean;
};

/**
 * CRAV shell for inner customer pages (cart, checkout, success, track): the
 * shared {@link SiteNav} plus a bold warm-black page-header band with an optional
 * back pill. Replaces the legacy CustomerPageShell / CustomerTopBar.
 */
export function SubPageShell({
  title,
  eyebrow,
  backHref,
  backLabel = "Back",
  navRight,
  children,
  mainClassName,
  hideHeader = false,
}: SubPageShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bun-cream">
      <SiteNav right={navRight} />

      {!hideHeader && (
        <header className="w-full border-b-2 border-bun-ink/10 bg-ink-section px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto flex w-full max-w-[1200px] items-center gap-4">
            {backHref ? (
              <Link
                href={backHref}
                aria-label={backLabel}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-bun-cream/25 bg-white/10 px-4 font-display text-sm font-semibold text-bun-cream transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-yellow"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{backLabel}</span>
              </Link>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? (
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-bun-yellow">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="font-display text-3xl font-bold tracking-tight text-bun-cream sm:text-4xl">
                {title}
              </h1>
            </div>
          </div>
        </header>
      )}

      <main className={cn("flex-1 px-4 py-8 sm:px-6", mainClassName)}>{children}</main>
    </div>
  );
}
