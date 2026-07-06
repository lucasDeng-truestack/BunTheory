import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-base font-medium tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-roast-red text-white shadow-soft hover:bg-deep-red hover:shadow-lift active:scale-[0.98]",
        secondary:
          "bg-mustard text-ink shadow-soft hover:bg-mustard/90 active:scale-[0.98]",
        outline:
          "border border-ink/20 text-ink bg-transparent hover:border-roast-red hover:text-roast-red",
        ghost: "text-ink hover:bg-surface-muted",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        /* ── CRAV loud pill CTAs (marketing storefront) ── */
        hero:
          "rounded-full bg-bun-red font-display font-semibold text-white shadow-sticker hover:-translate-y-0.5 hover:shadow-sticker-lg active:translate-y-0 active:shadow-sticker",
        yellow:
          "rounded-full bg-bun-yellow font-display font-semibold text-bun-ink shadow-sticker hover:-translate-y-0.5 hover:shadow-sticker-lg active:translate-y-0 active:shadow-sticker",
        dark:
          "rounded-full bg-bun-black font-display font-semibold text-bun-cream shadow-soft hover:bg-bun-ink active:scale-[0.98]",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-10 rounded-lg px-4 text-sm",
        lg: "h-14 rounded-xl px-8 text-lg",
        xl: "h-16 rounded-full px-10 text-xl",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
