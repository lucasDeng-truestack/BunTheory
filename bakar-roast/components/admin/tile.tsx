import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A Today tile: label, a big number in the display face, one line under it.
 * `hot` (needs action) adds the ember outline and an ember number. `href` makes it a link.
 */
export function Tile({
  label,
  value,
  sub,
  hot = false,
  href,
}: {
  label: string;
  value: number | string;
  sub: string;
  hot?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <span className="type-admin-meta text-cream-faint">{label}</span>
      <b
        className={cn(
          "font-display text-[52px] font-extrabold leading-[0.86] tabular-nums [font-stretch:80%]",
          hot && "text-ember",
        )}
      >
        {value}
      </b>
      <small className="text-[13px] text-cream-muted">{sub}</small>
    </>
  );
  const cls = cn(
    "grid content-start gap-1.5 rounded-card-sm bg-ink-raised p-4 text-left text-cream no-underline",
    hot && "shadow-[inset_0_0_0_1.5px_theme(colors.ember.DEFAULT)]",
  );
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-ink-line/60")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
