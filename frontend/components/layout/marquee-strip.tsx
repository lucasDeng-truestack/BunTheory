import { cn } from "@/lib/utils";

type MarqueeStripProps = {
  /** Phrases to scroll; repeated to fill the track. */
  items?: string[];
  tone?: "red" | "yellow" | "black";
  className?: string;
};

const toneClass = {
  red: "bg-bun-red text-white",
  yellow: "bg-bun-yellow text-bun-ink",
  black: "bg-bun-black text-bun-cream",
} as const;

const DEFAULT_ITEMS = [
  "Fire-roasted to order",
  "Soft hand-made buns",
  "Petaling Jaya",
  "Delivery & pickup",
  "Pay by QR or cash",
];

/**
 * CRAV-style scrolling ticker band. The row is duplicated so the `-50%`
 * marquee keyframe loops seamlessly. Decorative — paused for reduced-motion
 * users via the global media query.
 */
export function MarqueeStrip({ items = DEFAULT_ITEMS, tone = "red", className }: MarqueeStripProps) {
  const row = (
    <span className="marquee-track shrink-0" aria-hidden>
      {items.map((t, i) => (
        <span key={i} className="inline-flex items-center">
          <span className="px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] sm:text-base">
            {t}
          </span>
          <span className="text-lg opacity-60">✦</span>
        </span>
      ))}
    </span>
  );

  return (
    <div
      className={cn("w-full overflow-hidden border-y-2 border-bun-ink/10", toneClass[tone], className)}
      role="presentation"
    >
      <div className="flex w-max animate-marquee">
        {row}
        {row}
      </div>
    </div>
  );
}
