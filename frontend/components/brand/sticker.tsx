import { cn } from "@/lib/utils";

type StickerTone = "yellow" | "red" | "cream" | "black";

const toneClass: Record<StickerTone, string> = {
  yellow: "bg-bun-yellow text-bun-ink border-bun-ink",
  red: "bg-bun-red text-white border-bun-ink",
  cream: "bg-bun-cream-soft text-bun-ink border-bun-ink",
  black: "bg-bun-black text-bun-cream border-bun-black",
};

type StickerProps = {
  children: React.ReactNode;
  className?: string;
  tone?: StickerTone;
  /** Tilt in degrees; also seeds the idle wobble animation. */
  rotate?: number;
  /** Adds a slow idle wobble (respects prefers-reduced-motion via globals). */
  wobble?: boolean;
};

/**
 * CRAV-style circular/pill "sticker" — a bold, tilted callout used as an overlay
 * on hero photos and product cards (e.g. "NEW", "RM12", "FIRE-ROASTED").
 * Presentational only; place inside a `relative` parent and position with
 * `absolute` utility classes via `className`.
 */
export function Sticker({
  children,
  className,
  tone = "yellow",
  rotate = -8,
  wobble = false,
}: StickerProps) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full border-2 px-4 py-2 text-center font-display text-sm font-semibold uppercase leading-none tracking-wide shadow-sticker",
        toneClass[tone],
        wobble && "animate-wobble",
        className
      )}
      style={
        {
          "--sticker-rot": `${rotate}deg`,
          // When wobbling, the keyframes drive rotation via --sticker-rot;
          // otherwise apply a static tilt with the `rotate` property.
          ...(wobble ? {} : { rotate: `${rotate}deg` }),
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}
