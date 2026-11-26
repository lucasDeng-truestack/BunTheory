import { Ban, Check, CheckCheck, Clock, Hourglass, X, type LucideIcon } from "lucide-react";
import type { CateringBookingStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Booking status chip, 28px, not interactive. Told apart by fill weight, outline style,
 * icon and label. No hue outside the palette. Labels are fixed; do not reword them.
 */
const looks: Record<CateringBookingStatus, { label: string; Icon: LucideIcon; className: string; iconClass?: string }> = {
  PENDING: { label: "Pending", Icon: Clock, className: "border-[1.5px] border-ember text-cream", iconClass: "text-ember" },
  APPROVED: { label: "Approved", Icon: Check, className: "bg-ember text-ink" },
  COMPLETED: { label: "Completed", Icon: CheckCheck, className: "bg-cream text-ink" },
  DECLINED: { label: "Declined", Icon: X, className: "border-[1.5px] border-cream text-cream" },
  CANCELLED: { label: "Cancelled", Icon: Ban, className: "border-[1.5px] border-cream-faint text-cream-muted line-through" },
  EXPIRED: { label: "Expired", Icon: Hourglass, className: "border-[1.5px] border-dashed border-cream-faint text-cream-muted" },
};

export const statusLabel = (status: CateringBookingStatus) => looks[status].label;

export function StatusChip({ status, className }: { status: CateringBookingStatus; className?: string }) {
  const { label, Icon, className: look, iconClass } = looks[status];
  return (
    <span
      className={cn(
        "type-admin-meta inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 leading-none",
        look,
        className,
      )}
    >
      <Icon aria-hidden size={14} strokeWidth={1.75} className={cn("flex-none", iconClass)} />
      {label}
    </span>
  );
}
