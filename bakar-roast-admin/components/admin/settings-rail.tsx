import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RailRow = { label: string; value: string; unset?: boolean };

/**
 * The summary beside a settings form: what customers see right now, from the last saved values.
 * An unset row reads in the faint ink so it is told apart by its wording as well.
 */
export function SettingsRail({ title, rows, note }: { title: string; rows: RailRow[]; note: ReactNode }) {
  return (
    <aside className="grid content-start gap-2.5 rounded-card-sm border border-ink-line bg-ink-soft p-4 2xl:sticky 2xl:top-6">
      <h2 className="type-admin-meta m-0 text-cream-faint">{title}</h2>
      <dl className="m-0 grid">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 border-b border-ink-line py-2.5">
            <dt className="text-cream-muted">{r.label}</dt>
            <dd className={cn("m-0 text-right font-semibold [overflow-wrap:anywhere]", r.unset ? "text-cream-faint" : "text-cream")}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-[13px] text-cream-muted">{note}</p>
    </aside>
  );
}

/** A set value, or the fallback wording marked as unset. */
export const railRow = (label: string, value: string | null | undefined, fallback: string): RailRow => {
  const v = value?.trim();
  return v ? { label, value: v } : { label, value: fallback, unset: true };
};
