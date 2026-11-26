import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Round badge with circular text, one turn every 16s (stops under reduced motion).
 * One per page at most, over a corner of the hero photo or CtaBand. Never in booking, emails or admin.
 * - `text`: the ring words, repeated to fill the circle, e.g. "Fire • Feast • Family • Fire • Feast • Family • ".
 * - `label`: what a screen reader hears (ring text is hidden).
 * - `tone`: ember fill on dark photos, cream fill on ember areas.
 * - `size`: "responsive" 96px phone / 128px from 640px, or fixed "lg" 128 / "sm" 96.
 * - `href`: makes the centre chip a link (44px target).
 */
export function Stamp({
  text,
  label,
  tone = "ember",
  size = "responsive",
  href,
  className,
}: {
  text: string;
  label: string;
  tone?: "ember" | "cream";
  size?: "responsive" | "lg" | "sm";
  href?: string;
  className?: string;
}) {
  // Stable per text, so server and client agree and identical stamps share one harmless path.
  const pathId = `stamp-ring-${text.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const core = (
    <ArrowUpRight aria-hidden size={16} strokeWidth={1.75} />
  );
  const coreClass =
    "relative z-10 grid h-11 w-11 place-items-center rounded-full bg-ink text-cream";
  return (
    <div
      role={href ? undefined : "img"}
      aria-label={href ? undefined : label}
      className={cn(
        "relative grid flex-none place-items-center rounded-full text-ink",
        tone === "ember" ? "bg-ember" : "bg-cream",
        size === "responsive" && "h-24 w-24 sm:h-32 sm:w-32",
        size === "lg" && "h-32 w-32",
        size === "sm" && "h-24 w-24",
        className,
      )}
    >
      <svg
        viewBox="0 0 128 128"
        aria-hidden
        className="absolute inset-0 h-full w-full animate-spin-slow motion-reduce:animate-none"
      >
        <defs>
          <path id={pathId} d="M64 64m-48 0a48 48 0 1 1 96 0a48 48 0 1 1-96 0" />
        </defs>
        <text className="fill-current font-sans text-[11.5px] font-bold uppercase tracking-[0.14em]">
          <textPath href={`#${pathId}`} textLength="296">
            {text}
          </textPath>
        </text>
      </svg>
      {href ? (
        <Link href={href} aria-label={label} className={coreClass}>
          {core}
        </Link>
      ) : (
        <span className={coreClass}>{core}</span>
      )}
    </div>
  );
}
