import { cn } from "@/lib/utils";

type WaveDividerProps = {
  /** Fill of the wave — usually the color of the *next* section. */
  fill?: "cream" | "cream-soft" | "black" | "red" | "yellow";
  /** Flip vertically so the crest points up instead of down. */
  flip?: boolean;
  className?: string;
};

const fillHex: Record<NonNullable<WaveDividerProps["fill"]>, string> = {
  cream: "#FCEBCE",
  "cream-soft": "#FFF6E4",
  black: "#17120E",
  red: "#E4322B",
  yellow: "#FFC12B",
};

/**
 * CRAV-style wave transition between two full-bleed sections. Sits at the seam;
 * its `fill` should match the section it flows *into* so the join reads as one
 * continuous shape. Decorative only.
 */
export function WaveDivider({ fill = "cream", flip = false, className }: WaveDividerProps) {
  return (
    <div
      className={cn("pointer-events-none relative block w-full leading-[0]", flip && "rotate-180", className)}
      aria-hidden
    >
      <svg
        className="block h-[6vw] max-h-20 min-h-9 w-full"
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 48C120 12 300 0 480 18C660 36 780 78 960 78C1140 78 1320 36 1440 18V90H0V48Z"
          fill={fillHex[fill]}
        />
      </svg>
    </div>
  );
}
