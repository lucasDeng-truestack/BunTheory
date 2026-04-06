import Image from "next/image";
import { BRAND_FULL_NAME } from "@/lib/brand";
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
  /** When set (e.g. admin company logo URL), replaces the default asset. */
  src?: string | null;
  alt?: string;
};

/**
 * Square brand mark used in nav and admin chrome.
 */
function resolveImageSrc(src: string): string {
  const s = src.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) {
    const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(
      /\/$/,
      ""
    );
    return `${base}${s}`;
  }
  return s;
}

export function BrandLogo({
  size = "md",
  className,
  priority,
  src,
  alt,
}: BrandLogoProps) {
  const dim = SIZE_PX[size];
  const effectiveSrc = src?.trim()
    ? resolveImageSrc(src)
    : BRAND_LOGO_SRC;
  return (
    <Image
      src={effectiveSrc}
      alt={alt ?? BRAND_FULL_NAME}
      width={dim}
      height={dim}
      className={cn("object-contain object-center", className)}
      priority={priority}
      sizes={`${dim}px`}
      unoptimized={effectiveSrc.startsWith("data:")}
    />
  );
}
