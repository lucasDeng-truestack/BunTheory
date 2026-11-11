"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import {
  Ban,
  Bike,
  CheckCheck,
  ChefHat,
  FileText,
  HandPlatter,
  Inbox,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { updateOrderStatus, type Order, type OrderItem, type OrderStatus } from "@/lib/bun-theory-api";
import { imageSrc } from "@/lib/catering-api";
import { isSessionGone } from "@/lib/admin-session";
import { formatRM } from "@/lib/admin";
import {
  getSelectedOptionLines,
  isPdfReceiptUrl,
  lineCents,
  ORDER_STATUS_LABELS,
  orderRef,
  receiptStatusLabel,
  safeReceiptUrl,
} from "@/lib/bun-theory";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { useAdmin } from "@/components/admin/admin-context";
import { describeError } from "@/components/admin/admin-page";

// Pieces the orders list, order detail and receipts screens share.

export type Notice = { tone: "ok" | "error"; title: string; help?: string } | null;

/**
 * Order status chip, the same 28px shape as the booking StatusChip. Statuses differ by icon,
 * fill and outline: received and preparing are outlined, ready and on the way are ember,
 * handed over is cream, cancelled is struck through.
 */
const looks: Record<OrderStatus, { Icon: LucideIcon; className: string; iconClass?: string }> = {
  RECEIVED: { Icon: Inbox, className: "border-[1.5px] border-ember text-cream", iconClass: "text-ember" },
  PREPARING: { Icon: ChefHat, className: "border-[1.5px] border-dashed border-ember text-cream", iconClass: "text-ember" },
  READY: { Icon: PackageCheck, className: "bg-ember text-ink" },
  OUT_FOR_DELIVERY: { Icon: Bike, className: "bg-ember text-ink" },
  PICKED_UP: { Icon: HandPlatter, className: "bg-cream text-ink" },
  DELIVERED: { Icon: CheckCheck, className: "bg-cream text-ink" },
  COMPLETED: { Icon: CheckCheck, className: "bg-cream text-ink" },
  CANCELLED: { Icon: Ban, className: "border-[1.5px] border-cream-faint text-cream-muted line-through" },
};

export function OrderStatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  const { Icon, className: look, iconClass } = looks[status] ?? looks.RECEIVED;
  return (
    <span
      className={cn(
        "type-admin-meta inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 leading-none",
        look,
        className,
      )}
    >
      <Icon aria-hidden size={14} strokeWidth={1.75} className={cn("flex-none", iconClass)} />
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** Receipt state as text: "Awaiting receipt" is the one that needs the owner, so it is ember and bold. */
export function ReceiptLabel({ order, className }: { order: Order; className?: string }) {
  const label = receiptStatusLabel(order);
  return (
    <span
      className={cn(
        "whitespace-nowrap",
        label === "Awaiting receipt" && "font-bold text-ember",
        label === "Received" && "font-semibold text-cream",
        (label === "N/A" || label === "—") && "text-cream-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}

/**
 * Change an order's status: one save at a time per screen, the menu badge refreshed after each,
 * and a notice either way. Returns the updated order, or null on failure.
 */
export function useOrderStatus() {
  const { run, refreshOrdersPending } = useAdmin();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const change = async (order: Order, status: OrderStatus): Promise<Order | null> => {
    if (status === order.status) return order;
    setSavingId(order.id);
    setNotice(null);
    try {
      const updated = await run((t) => updateOrderStatus(t, order.id, status));
      setNotice({ tone: "ok", title: `Order ${orderRef(order)} is now ${ORDER_STATUS_LABELS[status].toLowerCase()}.` });
      return updated;
    } catch (err) {
      if (!isSessionGone(err)) setNotice({ tone: "error", ...describeError(err) });
      return null;
    } finally {
      setSavingId(null);
      refreshOrdersPending();
    }
  };

  return { change, savingId, notice, setNotice };
}

/**
 * The status picker. While a save is in flight it shows the chosen status and is disabled,
 * so it never snaps back before the answer arrives.
 */
export function OrderStatusSelect({
  order,
  options,
  saving,
  onChange,
  label,
  className,
}: {
  order: Order;
  options: OrderStatus[];
  saving: boolean;
  onChange: (status: OrderStatus) => void;
  label: ReactNode;
  className?: string;
}) {
  const [picked, setPicked] = useState<OrderStatus | null>(null);
  const value = saving && picked ? picked : order.status;
  return (
    <SelectField
      size="sm"
      label={label}
      value={value}
      disabled={saving}
      aria-busy={saving || undefined}
      onChange={(e) => {
        const s = e.target.value as OrderStatus;
        setPicked(s);
        onChange(s);
      }}
      className={className}
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS_LABELS[s]}
        </option>
      ))}
    </SelectField>
  );
}

/** Selected options and remarks under a line item (frontend order-line-item-extras). */
export function LineExtras({ oi, className }: { oi: OrderItem; className?: string }) {
  const lines = getSelectedOptionLines(oi);
  const remarks = oi.remarks?.trim();
  if (!lines.length && !remarks) return null;
  return (
    <div className={cn("grid gap-0.5 text-[13px] leading-snug text-cream-muted", className)}>
      {lines.map((line, i) => (
        <p key={i} className="m-0">
          <span aria-hidden className="text-cream-faint">
            ·{" "}
          </span>
          {line}
        </p>
      ))}
      {remarks && (
        <p className="m-0">
          <b className="font-semibold text-cream">Note:</b> {remarks}
        </p>
      )}
    </div>
  );
}

/** Quantity, name, extras and (optionally) the line total, one row per item. */
export function OrderLines({ order, prices = false, className }: { order: Order; prices?: boolean; className?: string }) {
  return (
    <ul className={cn("m-0 grid list-none p-0", className)}>
      {order.orderItems.map((oi, i) => {
        const line = prices ? lineCents(oi) : null;
        return (
          <li key={oi.id} className={cn("flex items-start justify-between gap-3 py-2.5", i === 0 ? "pt-0" : "border-t border-ink-line")}>
            <div className="min-w-0">
              <p className="m-0 font-semibold [overflow-wrap:anywhere]">
                <span className="text-ember">{oi.quantity}×</span> {oi.menu?.name ?? "Item"}
              </p>
              <LineExtras oi={oi} className="mt-1" />
            </div>
            {prices && <span className="flex-none font-semibold tabular-nums">{line === null ? "—" : formatRM(line)}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A payment receipt: a PDF opens in a new tab (with an inline preview when `pdfFrame`), an image
 * shows whole. Receipts can be data URLs or sit on any storage host, so the image is unoptimized.
 */
export function ReceiptPreview({
  order,
  pdfFrame = false,
  className,
}: {
  order: Order;
  pdfFrame?: boolean;
  className?: string;
}) {
  const raw = safeReceiptUrl(order.paymentReceiptUrl);
  const ref = orderRef(order);
  if (!raw) {
    return (
      <div className={cn("grid place-items-center rounded-card-sm border border-dashed border-cream-faint p-6 text-center text-cream-muted", className)}>
        No receipt uploaded yet.
      </div>
    );
  }
  const url = imageSrc(raw);
  if (isPdfReceiptUrl(raw)) {
    return (
      <div className={cn("grid content-start gap-3", className)}>
        <Button size="sm" variant="cream" href={url} target="_blank" rel="noopener noreferrer">
          <span className="inline-flex items-center gap-2">
            <FileText aria-hidden size={16} strokeWidth={1.75} />
            Open receipt PDF
          </span>
        </Button>
        {pdfFrame && (
          <iframe
            title={`Payment receipt PDF for order ${ref}`}
            src={url}
            className="h-[min(55vh,480px)] w-full rounded-card-sm border border-ink-line bg-cream"
          />
        )}
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open the payment receipt for order ${ref}`}
      className={cn("relative block aspect-[4/3] w-full overflow-hidden rounded-card-sm bg-ink", className)}
    >
      <Image src={url} alt={`Payment receipt for order ${ref}`} fill unoptimized sizes="(max-width: 768px) 100vw, 400px" className="object-contain" />
    </a>
  );
}

/** A titled admin block (ink-raised card). */
export function Block({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid content-start gap-2.5 rounded-card-sm bg-ink-raised p-4", className)}>
      <h2 className="type-admin-meta m-0 text-cream-faint">{title}</h2>
      {children}
    </section>
  );
}
