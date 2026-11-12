import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import type { CateringBookingPublic, CateringBookingStatus } from "@/lib/api";
import { statusCopy } from "@/lib/content";
import { formatDayMonth, formatLong, klYmd } from "@/lib/dates";
import { formatRm, formatTime12 } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusChip, statusLabel } from "@/components/ui/status-chip";
import { accent } from "@/components/sections/accent";
import { SummaryCard } from "@/components/booking/booking-summary";
import { PaymentPanel } from "@/components/booking/payment-panel";
import { CancelBooking, DeadlinePassed, StatusFocus } from "@/components/booking/cancel-booking";

type Dot = "done" | "current" | "ahead" | "stopped";
type TrackStep = { dot: Dot; title: string; line?: string };

function track(b: CateringBookingPublic, heldUntil: string | null): TrackStep[] {
  const sent: TrackStep = { dot: "done", title: "Request sent", line: formatDayMonth(klYmd(b.createdAt)) };
  const delivery = `${formatLong(b.eventDate)}, ${formatTime12(b.serviceTime)}`;
  switch (b.status) {
    case "PENDING": {
      const sentReceipt = b.receipts.length > 0;
      return [
        sent,
        sentReceipt
          ? { dot: "done", title: "Receipt sent", line: "We are checking it" }
          : { dot: "current", title: "Pay and upload the receipt", line: heldUntil ? `Spot held until ${heldUntil}` : undefined },
        { dot: sentReceipt ? "current" : "ahead", title: "Confirmed", line: "Once we see your payment" },
        { dot: "ahead", title: "We deliver", line: delivery },
      ];
    }
    case "APPROVED":
      return [
        sent,
        { dot: "done", title: "Paid" },
        { dot: "done", title: "Confirmed" },
        { dot: "current", title: "We deliver", line: delivery },
      ];
    case "COMPLETED":
      return [sent, { dot: "done", title: "Confirmed" }, { dot: "done", title: "Delivered", line: delivery }];
    default:
      return [sent, { dot: "stopped", title: statusLabel(b.status) }];
  }
}

/** Timeline dot: solid ember done, ember ring current, hollow faint ahead, struck cream ring stopped. */
function TrackDot({ dot }: { dot: Dot }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 bg-ink",
        dot === "done" && "border-ember bg-ember",
        dot === "current" && "border-ember shadow-[0_0_0_4px_theme(colors.ink.line)]",
        dot === "ahead" && "border-cream-faint",
        dot === "stopped" &&
          "border-cream bg-[linear-gradient(45deg,transparent_44%,theme(colors.cream.DEFAULT)_44%_56%,transparent_56%)]",
      )}
    />
  );
}

const DOT_SR: Record<Dot, string> = { done: "done", current: "now", ahead: "next", stopped: "stopped" };

/** The status page's back action. Exported so a client part can pick the label. */
export function BackLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-fit items-center gap-2 text-[15px] font-semibold text-cream-muted no-underline hover:text-cream"
    >
      <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
      {label}
    </Link>
  );
}

/**
 * The /booking/[token] block, one design per status: chip, headline, body, reference,
 * "Your table", the timeline and one action. `back` is the account seam: signed-in customers
 * get "All my bookings". Pass `{ label, href }`, or a node (a client part that reads the sign-in). `token` is the status token (for the cancel call).
 */
export function StatusTimeline({
  booking: b,
  token,
  back = statusCopy.back,
  headingId = "status-heading",
}: {
  booking: CateringBookingPublic;
  token: string;
  back?: { label: string; href: string } | ReactNode;
  /** Only for pages that show more than one timeline (/dev/components). */
  headingId?: string;
}) {
  const heldUntil = b.holdExpiresAt ? formatDayMonth(klYmd(b.holdExpiresAt)) : null;
  const s: CateringBookingStatus = b.status;
  const body =
    s === "PENDING"
      ? statusCopy.body.PENDING(heldUntil)
      : s === "DECLINED"
        ? `${statusCopy.body.DECLINED}${b.declineReason ? ` "${b.declineReason}"` : ""}`
        : statusCopy.body[s];
  const steps = track(b, heldUntil);

  let action: React.ReactNode = null;
  if (s === "PENDING" || s === "APPROVED") {
    action = b.canCancel ? (
      <CancelBooking
        token={token}
        kind={s === "PENDING" ? "request" : "booking"}
        dateWords={formatLong(b.eventDate)}
        cancelBy={formatDayMonth(b.cancelDeadline)}
        status={s}
      />
    ) : (
      <DeadlinePassed />
    );
  } else if (s === "DECLINED") {
    action = <Button href="/catering/book">{statusCopy.pickAnother}</Button>;
  } else if (s === "CANCELLED" || s === "EXPIRED") {
    action = <Button href="/catering/book">{statusCopy.bookAgain}</Button>;
  }

  return (
    <div className="grid max-w-[820px] gap-7">
      {back && typeof back === "object" && "href" in back ? <BackLink {...back} /> : back}
      <div>
        <StatusChip status={s} />
      </div>
      <div className="grid gap-4">
        <StatusFocus status={s} headingId={headingId} />
        <h1 id={headingId} tabIndex={-1} className="display-lg m-0 text-balance focus:outline-none">
          {accent(statusCopy.headline[s])}
        </h1>
        <p className="type-body-lg m-0 max-w-[60ch] text-cream-muted">{body}</p>
      </div>
      <p className="m-0">
        <span className="sr-only">Reference </span>
        <span className="display-md">{b.reference}</span>
      </p>
      <SummaryCard
        title={statusCopy.summary}
        rows={[
          { label: "Date", value: formatLong(b.eventDate) },
          { label: "Package", value: `${b.packageName}, ${b.guests} pax` },
          { label: "Delivery time", value: formatTime12(b.serviceTime) },
          { label: "Deliver to", value: b.eventAddress },
          { label: "Total", value: b.totalAmount ? formatRm(Math.round(Number(b.totalAmount) * 100)) : null },
        ]}
      />
      <PaymentPanel booking={b} token={token} />
      <ol aria-label="Progress" className="m-0 grid list-none p-0">
        {steps.map((t, i) => (
          <li
            key={t.title}
            aria-current={t.dot === "current" ? "step" : undefined}
            className={cn(
              "relative pb-6 pl-8 last:pb-0",
              t.dot === "ahead" ? "text-cream-faint" : "text-cream",
            )}
          >
            <TrackDot dot={t.dot} />
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn("absolute bottom-0 left-1.5 top-[22px] w-0.5", t.dot === "done" ? "bg-ember" : "bg-ink-line")}
              />
            )}
            <b className="block">
              {t.title}
              <span className="sr-only">, {DOT_SR[t.dot]}</span>
            </b>
            {t.line && <span className="type-small text-cream-muted">{t.line}</span>}
          </li>
        ))}
      </ol>
      {action && <div>{action}</div>}
    </div>
  );
}
