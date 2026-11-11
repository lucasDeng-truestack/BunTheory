import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SummaryRow = { label: string; value: ReactNode | null | undefined };

/**
 * The "Your table" card: label and value rows on ink-raised. Used as the desktop side panel,
 * the review cards (with an Edit `action` in the head) and on the status page.
 * Empty values read `emptyText` ("Not yet" while booking, "None" on review) in cream-faint.
 * Never a price or total.
 */
export function SummaryCard({
  title,
  rows,
  action,
  note,
  emptyText = "Not yet",
  as: Tag = "section",
  className,
}: {
  title: string;
  rows: SummaryRow[];
  action?: ReactNode;
  note?: ReactNode;
  emptyText?: string;
  as?: "section" | "aside" | "div";
  className?: string;
}) {
  return (
    <Tag aria-label={title} className={cn("grid rounded-card-md bg-ink-raised p-6", className)}>
      <div className="mb-3 flex min-h-6 items-center justify-between gap-4">
        <h2 className="type-eyebrow m-0 text-cream-muted">{title}</h2>
        {action}
      </div>
      <dl className="m-0 grid">
        {rows.map((r) => {
          const empty = r.value == null || r.value === "";
          return (
            <div key={r.label} className="flex items-baseline justify-between gap-4 border-t border-ink-line py-3">
              <dt className="type-small flex-none text-cream-muted">{r.label}</dt>
              <dd className={cn("m-0 min-w-0 break-words text-right", empty ? "text-cream-faint" : "font-semibold")}>
                {empty ? emptyText : r.value}
              </dd>
            </div>
          );
        })}
      </dl>
      {note && <p className="type-small m-0 mt-3 text-cream-muted">{note}</p>}
    </Tag>
  );
}

/**
 * Phone only: the sticky bar at the bottom with the one-line summary, the step count and the
 * next action (the step's primary button lives here on phone). Hidden from 1024px.
 */
export function StickyBar({
  summary,
  step,
  action,
  className,
}: {
  summary: string;
  step: string;
  action: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("fixed inset-x-0 bottom-0 z-40 bg-gradient-to-b from-transparent to-ink to-45% px-[max(16px,env(safe-area-inset-left))] pb-[calc(12px+env(safe-area-inset-bottom))] pt-6 lg:hidden", className)}>
      <div className="flex items-center justify-between gap-3 rounded-full border border-ink-line bg-ink-raised py-2.5 pl-[18px] pr-2.5">
        <div className="min-w-0 flex-1">
          <small className="line-clamp-2 block text-[13px] text-cream-muted">{summary}</small>
          <b className="whitespace-nowrap text-[15px]">{step}</b>
        </div>
        {action}
      </div>
    </div>
  );
}
