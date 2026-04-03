"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRangeFilter } from "@/lib/dashboard-metrics";

const OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

type Props = {
  value: DateRangeFilter;
  onChange: (v: DateRangeFilter) => void;
  id?: string;
  className?: string;
};

export function DashboardTimeRangeSelect({
  value,
  onChange,
  id,
  className,
}: Props) {
  return (
    <div className={className}>
      <label
        htmlFor={id ?? "dashboard-range"}
        className="font-display mb-1.5 block text-sm font-semibold text-charcoal/80"
      >
        Time range
      </label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as DateRangeFilter)}
      >
        <SelectTrigger
          id={id ?? "dashboard-range"}
          className="w-full min-h-11 rounded-xl border-charcoal/15 bg-white font-display sm:w-[200px]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
