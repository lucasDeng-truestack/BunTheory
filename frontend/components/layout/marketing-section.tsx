import { cn } from "@/lib/utils";

type SectionTone = "cream" | "cream-soft" | "ink" | "checker";

const toneClass: Record<SectionTone, string> = {
  cream: "bg-cream-section text-bun-ink",
  "cream-soft": "bg-bun-cream-soft text-bun-ink",
  ink: "bg-ink-section text-bun-cream",
  checker: "bg-checker text-bun-ink",
};

type MarketingSectionProps = {
  children: React.ReactNode;
  tone?: SectionTone;
  /** Small uppercase kicker above the heading. */
  eyebrow?: string;
  /** Big stacked display heading. */
  heading?: React.ReactNode;
  /** Short supporting copy under the heading. */
  intro?: React.ReactNode;
  /** Center the header block (default) or left-align it. */
  align?: "center" | "left";
  id?: string;
  className?: string;
  /** Classes for the inner max-width container. */
  containerClassName?: string;
};

/**
 * Full-bleed marketing band with the CRAV alternating cream ↔ black rhythm and
 * an optional stacked header (eyebrow + oversized display heading + intro).
 * Landing/story pages (Phase 2 / Phase 4) compose these.
 */
export function MarketingSection({
  children,
  tone = "cream",
  eyebrow,
  heading,
  intro,
  align = "center",
  id,
  className,
  containerClassName,
}: MarketingSectionProps) {
  const isInk = tone === "ink";
  return (
    <section
      id={id}
      className={cn("relative w-full px-4 py-16 sm:px-6 sm:py-20 lg:py-24", toneClass[tone], className)}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-[1200px]",
          align === "center" ? "text-center" : "text-left",
          containerClassName
        )}
      >
        {(eyebrow || heading || intro) && (
          <div className={cn("mb-10 sm:mb-14", align === "center" && "mx-auto max-w-3xl")}>
            {eyebrow && (
              <p
                className={cn(
                  "mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em]",
                  isInk ? "text-bun-yellow" : "text-bun-red"
                )}
              >
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2
                className={cn(
                  "font-display text-4xl font-bold leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl",
                  isInk ? "text-bun-cream" : "text-bun-ink"
                )}
              >
                {heading}
              </h2>
            )}
            {intro && (
              <p
                className={cn(
                  "mt-5 text-base leading-relaxed sm:text-lg",
                  isInk ? "text-bun-cream/80" : "text-bun-ink-soft"
                )}
              >
                {intro}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
