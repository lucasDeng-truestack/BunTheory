import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The round "!" mark used by errors (a shape, so errors never rely on red alone). */
export function ErrorMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-5 w-5 flex-none place-items-center rounded-full bg-ember-heat text-[13px] font-extrabold leading-none text-cream",
        className,
      )}
    >
      !
    </span>
  );
}

/**
 * Inline message. `error`: 2px heat edge + "!" mark, wording in cream, role="alert".
 * `ok`: ember edge + dot, role="status" (admin saves). `title` is the bold line,
 * children the plain line (may hold links).
 */
export function Banner({
  tone,
  title,
  children,
  className,
}: {
  tone: "error" | "ok";
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-tone="ink"
      className={cn(
        "flex items-start gap-3 rounded-card-sm bg-ink-raised px-[18px] py-4 text-cream",
        tone === "error" ? "border-2 border-ember-heat" : "border border-ember",
        className,
      )}
    >
      {tone === "error" ? (
        <ErrorMark className="mt-0.5" />
      ) : (
        <span aria-hidden className="mt-[7px] h-2.5 w-2.5 flex-none rounded-full bg-ember" />
      )}
      <div className="min-w-0">
        <b className="block font-semibold">{title}</b>
        {children && <div className="type-small mt-0.5 text-cream-muted">{children}</div>}
      </div>
    </div>
  );
}

/** Dashed box for a list with nothing to show: one bold line, one plain line, optional action. */
export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-1 rounded-card-sm border border-dashed border-cream-faint px-5 py-8 text-center text-cream-muted",
        className,
      )}
    >
      <b className="text-lg font-semibold text-cream">{title}</b>
      {children && <p className="m-0">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Loading placeholder. Shape it with className (h-*, w-*, rounded-*); the parent sets aria-busy. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("skeleton-shimmer min-h-4 animate-shimmer rounded-card-sm", className)}
    />
  );
}
