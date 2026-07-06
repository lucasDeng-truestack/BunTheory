import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaBandProps = {
  eyebrow?: string;
  heading: React.ReactNode;
  subheading?: React.ReactNode;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  /** Overrides the default primary/secondary buttons (e.g. a batch-aware CTA). */
  action?: React.ReactNode;
  className?: string;
};

/**
 * The repeated dark CTA band that closes CRAV sections ("Ready to order?").
 * Warm-black wash, oversized display heading, loud pill buttons. Reuse it at the
 * foot of the landing + story pages. Pass a batch-aware `primary` (e.g. disabled
 * / "Ordering closed" label) so it reflects batch state.
 */
export function CtaBand({
  eyebrow,
  heading,
  subheading,
  primary = { href: "/menu", label: "Order Now" },
  secondary,
  action,
  className,
}: CtaBandProps) {
  return (
    <section className={cn("relative w-full overflow-hidden bg-cta-banner px-4 py-20 text-center sm:px-6 sm:py-24", className)}>
      <div className="mx-auto w-full max-w-3xl">
        {eyebrow && (
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-yellow">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-bun-cream sm:text-5xl lg:text-6xl">
          {heading}
        </h2>
        {subheading && (
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-bun-cream/80 sm:text-lg">
            {subheading}
          </p>
        )}
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {action ?? (
            <Button asChild variant="hero" size="lg">
              <Link href={primary.href}>{primary.label}</Link>
            </Button>
          )}
          {secondary && (
            <Button asChild variant="yellow" size="lg">
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
