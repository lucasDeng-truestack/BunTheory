import Image from "next/image";
import Link from "next/link";
import { BRAND_FULL_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const linkClassName =
  "font-medium text-roast-red underline underline-offset-2 hover:opacity-90";

export type SiteFooterProps = {
  className?: string;
  /** Lead sentence before the track link (ends with space; track link + period follow). */
  supportLead?: string;
  trackHref?: string;
  trackLabel?: string;
  portfolioUrl?: string;
  portfolioLabel?: string;
  /** Visible attribution for copyright (defaults to full brand string). */
  copyrightName?: string;
  logoSrc?: string;
  logoAlt?: string;
};

export default function SiteFooter({
  className,
  supportLead = "Questions about your order? You'll get updates on WhatsApp — we roast to order and pack it fresh.",
  trackHref = "/track",
  trackLabel = "Track an active order",
  portfolioUrl = "https://www.imsolucas-portfolio.vercel.app/",
  portfolioLabel = "Lucas",
  copyrightName = BRAND_FULL_NAME,
  logoSrc = "/logo.png",
  logoAlt = "",
}: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "mt-10 space-y-10 text-center lg:mt-12 [&>p]:text-fine-print",
        className
      )}
    >
      <p>
        {supportLead}{" "}
        <Link href={trackHref} className={linkClassName}>
          {trackLabel}
        </Link>
        .
      </p>

      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        Powered by{" "}
        <span className="inline-flex items-center gap-1.5">
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={18}
            height={18}
            className="h-[18px] w-[18px] shrink-0 object-contain"
          />
          <a
            href={portfolioUrl}
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {portfolioLabel}
          </a>
        </span>
      </p>

      <p>
        © {year} {copyrightName}
      </p>
    </footer>
  );
}
