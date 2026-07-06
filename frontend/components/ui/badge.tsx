import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-roast-red text-white",
        secondary: "bg-mustard text-ink",
        outline: "border border-roast-red text-roast-red",
        destructive: "bg-red-600 text-white",
        /* ── CRAV sticker chips (hard offset border, uppercase) ── */
        yellow: "bg-bun-yellow text-bun-ink",
        dark: "bg-bun-black text-bun-cream",
        sticker:
          "border-2 border-bun-ink bg-bun-yellow px-3 py-1 font-display font-semibold uppercase tracking-wide text-bun-ink shadow-sticker",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
