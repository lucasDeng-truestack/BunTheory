"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { BRAND_TITLE_LINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type SiteNavLink = { href: string; label: string };

type SiteNavProps = {
  links?: SiteNavLink[];
  /** Primary pill CTA on the right (label + href). */
  cta?: { href: string; label: string };
  /** Right-side slot rendered before the CTA (e.g. cart button). */
  right?: React.ReactNode;
  className?: string;
};

const DEFAULT_LINKS: SiteNavLink[] = [
  { href: "/menu", label: "Menu" },
  { href: "/story", label: "Our Story" },
  { href: "/track", label: "Track" },
];

const pillLink =
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 font-display text-sm font-medium tracking-wide text-bun-ink transition-colors hover:bg-bun-ink hover:text-bun-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red/40 focus-visible:ring-offset-2";

/**
 * CRAV-style storefront nav: bold wordmark left; pill links + primary CTA right;
 * collapses to a hamburger + slide-down sheet on mobile. Sticky, cream chrome
 * with a hairline underline. Marketing pages (Phase 2+) mount this at the top.
 */
export function SiteNav({
  links = DEFAULT_LINKS,
  cta = { href: "/menu", label: "Order Now" },
  right,
  className,
}: SiteNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full max-w-full overflow-x-clip border-b-2 border-bun-ink/10 bg-bun-cream/85 backdrop-blur-lg supports-[backdrop-filter]:bg-bun-cream/70",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 focus-visible:outline-none"
          aria-label={BRAND_TITLE_LINE}
        >
          <span className="shrink-0 rounded-xl border-2 border-bun-ink bg-white p-1 shadow-sticker">
            <BrandLogo size="sm" priority />
          </span>
          <span className="font-display text-lg font-bold leading-none tracking-tight text-bun-red sm:text-xl">
            {BRAND_TITLE_LINE}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pillLink}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {right}
          <Button asChild variant="hero" size="sm" className="hidden sm:inline-flex">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-bun-ink bg-white text-bun-ink shadow-sticker transition-transform active:scale-95 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <m.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden border-t-2 border-bun-ink/10 bg-bun-cream lg:hidden"
          >
            <nav
              className="mx-auto flex w-full max-w-[1400px] flex-col gap-1 px-4 py-4 sm:px-6"
              aria-label="Mobile"
            >
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 font-display text-lg font-semibold text-bun-ink transition-colors hover:bg-bun-ink hover:text-bun-cream"
                >
                  {l.label}
                </Link>
              ))}
              <Button asChild variant="hero" size="lg" className="mt-2">
                <Link href={cta.href} onClick={() => setOpen(false)}>
                  {cta.label}
                </Link>
              </Button>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
