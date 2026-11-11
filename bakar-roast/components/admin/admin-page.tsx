"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "@/lib/api";
import { adminCopy } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/headline";
import { useAdmin } from "@/components/admin/admin-context";

/** The admin display style: page titles only (tiles, date blocks and the payment headline set their own). */
export const ADMIN_TITLE =
  "m-0 font-display text-[clamp(34px,4.2vw,52px)] font-extrabold uppercase leading-[0.9] tracking-[-0.02em] [font-stretch:80%] [text-wrap:balance]";

/**
 * A screen inside the shell: page header (display-face title, optional eyebrow, lead line and
 * actions), then the content. On phone the title is visually hidden because the top bar shows it;
 * pass `titleOnPhone` for a title that is content (the Today greeting).
 */
export function AdminPage({
  title,
  eyebrow,
  lead,
  actions,
  titleOnPhone = false,
  children,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  titleOnPhone?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="grid animate-fade-in content-start gap-5">
      {/* Title only, on phone: out of the flow (the top bar shows it), still read out. */}
      <div className={cn("grid gap-3", !titleOnPhone && !eyebrow && !lead && !actions && "max-lg:sr-only")}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className={cn(ADMIN_TITLE, !titleOnPhone && "max-lg:sr-only")}>{title}</h1>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {lead && <p className="m-0 max-w-[70ch] text-cream-muted">{lead}</p>}
      </div>
      {children}
    </div>
  );
}

/** The phone sticky action bar (a request's Approve, Decline, Cancel): portals into the shell and hides the tab bar. */
export function AdminActionBar({ children }: { children: ReactNode }) {
  const { actionSlot, setHasActionBar } = useAdmin();
  useLayoutEffect(() => {
    setHasActionBar(true);
    return () => setHasActionBar(false);
  }, [setHasActionBar]);
  return actionSlot ? createPortal(children, actionSlot) : null;
}

/** The ember count badge. Hidden at zero. */
export function PendingBadge({ count, className }: { count: number | null | undefined; className?: string }) {
  if (!count) return null;
  return (
    <span
      aria-label={`${count} pending`}
      className={cn(
        "inline-block h-5 min-w-5 rounded-[10px] bg-ember px-1.5 text-center text-xs font-bold not-italic leading-5 text-ink",
        className,
      )}
    >
      {count}
    </span>
  );
}

/** Title and plain line for a failed call, by status and code. */
export function describeError(err: unknown): { title: string; help?: string } {
  if (err instanceof ApiError) {
    if (err.status === 403) return { title: adminCopy.errors.forbidden };
    if (err.code === "INVALID_STATE") return { title: adminCopy.errors.changed };
    if (err.status === 400 || err.status === 409) return { title: err.message };
  }
  return { title: adminCopy.errors.saveFailed, help: adminCopy.errors.saveFailedHelp };
}

/** A failed load: error Banner with Retry. */
export function LoadError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  return (
    <div className={cn("grid justify-items-start gap-3", className)}>
      <Banner tone="error" title={adminCopy.errors.loadFailed} className="w-full">
        {adminCopy.errors.loadFailedHelp}
      </Banner>
      <Button size="sm" variant="cream" onClick={onRetry}>
        {adminCopy.errors.retry}
      </Button>
    </div>
  );
}
