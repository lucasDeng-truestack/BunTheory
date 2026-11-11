import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Eyebrow: 13px uppercase label with an 8px dot. On cream bands the text turns ink and
 * the dot heat red automatically (via the band's tone variables).
 */
export function Eyebrow({
  children,
  className,
  as: Tag = "p",
  dot = true,
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Footer column heads use the eyebrow style without the dot. */
  dot?: boolean;
}) {
  return (
    <Tag className={cn("type-eyebrow m-0 inline-flex items-center gap-2.5 text-tone-muted", className)}>
      {dot && <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-tone-accent" />}
      {children}
    </Tag>
  );
}

export type HeadlineSize = "hero" | "xl" | "lg" | "md" | "sm";

const sizeClass: Record<HeadlineSize, string> = {
  hero: "display-hero",
  xl: "display-xl",
  lg: "display-lg",
  md: "display-md",
  sm: "display-sm",
};

/**
 * Eyebrow + display headline. Wrap exactly one accent word in <em>.
 * `tone` forces the accent: "ink" = ember (ink bands), "cream" = ember-heat (cream bands).
 * Leave it out and the accent follows the surrounding <Band>.
 * Hero: pass three lines as block spans, the last in <em>.
 */
export function Headline({
  children,
  eyebrow,
  size = "xl",
  as: Tag = "h2",
  tone,
  className,
  headingClassName,
}: {
  children: ReactNode;
  eyebrow?: ReactNode;
  size?: HeadlineSize;
  as?: ElementType;
  tone?: "ink" | "cream";
  /** Applies to the wrapper when there is an eyebrow, otherwise to the heading. */
  className?: string;
  headingClassName?: string;
}) {
  const heading = (
    <Tag
      className={cn(
        sizeClass[size],
        "m-0 text-balance",
        tone === "ink" && "[&_em]:text-ember",
        tone === "cream" && "[&_em]:text-ember-heat",
        !eyebrow && className,
        headingClassName,
      )}
    >
      {children}
    </Tag>
  );
  if (!eyebrow) return heading;
  return (
    <div className={cn("grid justify-items-start gap-5", className)}>
      <Eyebrow className={tone === "cream" ? "text-ink [&>span]:bg-ember-heat" : undefined}>
        {eyebrow}
      </Eyebrow>
      {heading}
    </div>
  );
}
