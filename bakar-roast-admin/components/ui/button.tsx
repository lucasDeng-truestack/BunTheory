import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes, type ReactNode } from "react";
import { cva } from "class-variance-authority";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The pill button. Label left, round arrow chip right.
 * - `ember` primary (one per view), `cream` secondary on ink, `ink` on cream/ember/amber panels,
 *   `ghost` quiet choice (no chip).
 * - Sizes: default 56px, `md` 48px (header only), `sm` 44px no chip (admin only).
 * - `href` renders a Link (internal) or <a> (external, http/mailto/tel); otherwise a <button>.
 * Magnetic pull is opt-in: wrap in <Magnetic> from components/magnetic.
 */

export type ButtonVariant = "ember" | "cream" | "ink" | "ghost";
export type ButtonSize = "default" | "md" | "sm";

const buttonVariants = cva(
  "group/btn inline-flex w-fit shrink-0 select-none items-center whitespace-nowrap rounded-full font-sans font-semibold leading-none no-underline transition-colors duration-300 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        ember: "bg-ember text-ink hover:bg-ember-glow",
        cream: "bg-cream text-ink",
        ink: "bg-ink text-cream hover:bg-ink-raised",
        ghost: "bg-transparent text-cream shadow-[inset_0_0_0_1px_theme(colors.cream.faint)] hover:shadow-[inset_0_0_0_1px_theme(colors.cream.DEFAULT)]",
      },
      size: {
        default: "h-14 gap-5 text-base",
        md: "h-12 gap-4 text-[15px]",
        sm: "h-11 justify-center gap-2 px-5 text-sm",
      },
      chip: { true: "", false: "" },
      disabledLook: {
        true: "!bg-ink-raised !text-cream-faint !shadow-none",
        false: "",
      },
    },
    compoundVariants: [
      { chip: true, size: "default", className: "justify-between pl-7 pr-2" },
      { chip: true, size: "md", className: "justify-between pl-6 pr-2" },
      { chip: false, size: "default", className: "justify-center px-7" },
      { chip: false, size: "md", className: "justify-center px-6" },
    ],
    defaultVariants: { variant: "ember", size: "default", chip: true, disabledLook: false },
  },
);

const chipColour: Record<ButtonVariant, string> = {
  ember: "bg-ink text-cream",
  cream: "bg-ember text-ink",
  ink: "bg-ember text-ink",
  ghost: "",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show the arrow chip. Defaults to true, except `ghost` and `sm` which never have one. */
  chip?: boolean;
  /** Submitting: sets aria-busy, swaps the arrow for a spinner and the label for `loadingLabel`. */
  loading?: boolean;
  loadingLabel?: ReactNode;
  /** Full width. */
  block?: boolean;
  className?: string;
  children: ReactNode;
};

export type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };
export type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string };
export type ButtonProps = ButtonAsButton | ButtonAsLink;

function Spinner() {
  return (
    <span
      aria-hidden
      className="block h-4 w-4 animate-spin-fast rounded-full border-2 border-current border-r-transparent"
    />
  );
}

const isExternal = (href: string) => /^(https?:|mailto:|tel:|\/\/)/.test(href);

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(
  props,
  ref,
) {
  const {
    variant = "ember",
    size = "default",
    chip: chipProp,
    loading = false,
    loadingLabel,
    block = false,
    className,
    children,
    ...rest
  } = props;
  const chip = (chipProp ?? true) && variant !== "ghost" && size !== "sm";
  const disabled = "disabled" in rest && !!rest.disabled;

  const classes = cn(
    buttonVariants({ variant, size, chip, disabledLook: disabled }),
    block && "flex w-full",
    className,
  );

  const content = (
    <>
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
      {chip ? (
        <span
          className={cn(
            "grid flex-none place-items-center rounded-full",
            size === "md" ? "h-8 w-8" : "h-10 w-10",
            disabled ? "bg-ink-line text-cream-faint" : chipColour[variant],
          )}
        >
          {loading ? (
            <Spinner />
          ) : (
            <ArrowUpRight
              aria-hidden
              size={16}
              strokeWidth={1.75}
              className="transition-transform duration-[400ms] ease-expo-out group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5"
            />
          )}
        </span>
      ) : (
        loading && <Spinner />
      )}
    </>
  );

  if (rest.href !== undefined) {
    const { href, ...anchor } = rest as ButtonAsLink;
    const shared = {
      ...anchor,
      className: classes,
      "aria-busy": loading || undefined,
      ref: ref as React.Ref<HTMLAnchorElement>,
    };
    return isExternal(href) ? (
      <a href={href} {...shared}>
        {content}
      </a>
    ) : (
      <Link href={href} {...shared}>
        {content}
      </Link>
    );
  }

  const { type = "button", ...button } = rest as ButtonAsButton;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      {...button}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </button>
  );
});
