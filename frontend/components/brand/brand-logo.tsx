import Image from "next/image";
import { cn } from "@/lib/utils";

/** Public path — file lives in `public/images/branding/` */
export const BRAND_LOGO_SRC = "/images/branding/bakar-roast-logo.png" as const;

const SIZE_PX = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 72,
  xl: 112,
} as const;

export type BrandLogoSize = keyof typeof SIZE_PX;

type BrandLogoProps = {
  size?: BrandLogoSize;
  className?: string;
  /** Set on LCP / above-the-fold instances */
  priority?: boolean;
};

/**
 * Bakar & Roast parent brand mark (square asset).
 */
export function BrandLogo({
  size = "md",
  className,
  priority,
}: BrandLogoProps) {
  const dim = SIZE_PX[size];
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt="Bakar & Roast"
      width={dim}
      height={dim}
      className={cn("object-contain object-center", className)}
      priority={priority}
      sizes={`${dim}px`}
    />
  );
}
