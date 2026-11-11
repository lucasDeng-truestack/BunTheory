import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BandTone = "base" | "raised" | "soft" | "cream";

const toneClass: Record<BandTone, string> = {
  base: "bg-ink text-cream",
  raised: "bg-ink-raised text-cream",
  soft: "bg-ink-soft text-cream",
  cream: "bg-cream text-ink",
};

/**
 * Full-width section band with section padding (88px phone to 176px desktop).
 * tone="cream" sets data-tone="cream", which switches accent words to heat red, eyebrows
 * to ink and focus rings to ink for everything inside. `tight` drops the padding
 * (for bands that manage their own spacing).
 */
export function Band({
  tone = "base",
  as: Tag = "section",
  tight = false,
  className,
  children,
  ...rest
}: {
  tone?: BandTone;
  as?: ElementType;
  tight?: boolean;
  className?: string;
  children: ReactNode;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <Tag
      data-tone={tone === "cream" ? "cream" : "ink"}
      className={cn("relative", toneClass[tone], !tight && "py-section", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Content width (1440px) with the 18px to 56px side gutter. */
export function Container({
  as: Tag = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full max-w-content",
        "pl-[max(theme(spacing.gutter),env(safe-area-inset-left))] pr-[max(theme(spacing.gutter),env(safe-area-inset-right))]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
