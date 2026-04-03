import type { OrderItem } from "@/types/order";

type OptionsSnap = {
  summary?: string[];
  detail?: Array<{ groupName?: string; label?: string }>;
};

/** Human-readable option lines from checkout (`summary`, or `detail` as fallback). */
export function getSelectedOptionLines(oi: OrderItem): string[] {
  const snap = oi.selectedOptions as OptionsSnap | null | undefined;
  if (snap?.summary?.length) {
    return snap.summary.filter((s): s is string => Boolean(s?.trim()));
  }
  if (snap?.detail?.length) {
    return snap.detail
      .map((d) => {
        if (d.groupName?.trim() && d.label?.trim()) {
          return `${d.groupName.trim()}: ${d.label.trim()}`;
        }
        return d.label?.trim() ?? "";
      })
      .filter(Boolean);
  }
  return [];
}
