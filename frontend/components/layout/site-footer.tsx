import Link from "next/link";
import Image from "next/image";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND_TITLE_LINE, BRAND_SUBLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

type FooterCol = { heading: string; links: { href: string; label: string }[] };

const COLS: FooterCol[] = [
  {
    heading: "Order",
    links: [
      { href: "/menu", label: "Menu" },
      { href: "/order", label: "Cart" },
      { href: "/track", label: "Track order" },
    ],
  },
  {
    heading: "Bun Theory",
    links: [
      { href: "/story", label: "Our story" },
      { href: "/", label: "Home" },
    ],
  },
];

/**
 * CRAV-style storefront footer: warm-black band, oversized wordmark, quick
 * links, and a credit line. Full-bleed — drop it at the bottom of marketing
 * pages (no surrounding padding needed).
 */
export function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className={cn("w-full bg-bun-black px-4 pb-10 pt-16 text-bun-cream sm:px-6", className)}>
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label={BRAND_TITLE_LINE}>
              <span className="rounded-xl border-2 border-bun-cream/20 bg-white p-1.5">
                <BrandLogo size="md" />
              </span>
              <span>
                <span className="block font-display text-2xl font-bold leading-none text-bun-yellow">
                  {BRAND_TITLE_LINE}
                </span>
                <span className="mt-1 block font-display text-xs uppercase tracking-[0.2em] text-bun-cream/60">
                  {BRAND_SUBLINE}
                </span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-bun-cream/70">
              Fire-roasted buns from our home kitchen in Petaling Jaya. Ordering runs in batch
              windows — hop on when a batch is live.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.heading}>
              <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-bun-yellow">
                {col.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="font-display text-base text-bun-cream/80 transition-colors hover:text-bun-yellow"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-bun-cream/10 pt-6 text-center text-xs text-bun-cream/60 sm:flex-row sm:justify-between sm:text-left">
          <p>
            © {year} {BRAND_TITLE_LINE} {BRAND_SUBLINE}
          </p>
          <p className="inline-flex items-center gap-1.5">
            Crafted by
            <Image src="/logo.png" alt="" width={16} height={16} className="h-4 w-4 object-contain" />
            <a
              href="https://lucasdyj.dev/"
              rel="noopener noreferrer"
              className="font-semibold text-bun-cream/80 underline-offset-2 hover:text-bun-yellow hover:underline"
            >
              Lucas
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
