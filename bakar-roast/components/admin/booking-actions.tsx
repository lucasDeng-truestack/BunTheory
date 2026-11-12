"use client";

import { useEffect, useState } from "react";
import { ApiError, type CateringBookingAdmin } from "@/lib/api";
import { adminApprove, adminCancel, adminComplete, adminDecline } from "@/lib/catering-api";
import { amountsError, centsToAmount, firstName, toCents } from "@/lib/admin";
import { formatLong, klToday } from "@/lib/dates";
import { Banner } from "@/components/ui/banner";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { useAdmin } from "@/components/admin/admin-context";
import { describeError } from "@/components/admin/admin-page";

export type BookingAction = "approve" | "decline" | "cancel" | "complete";

/** Which actions a status allows, in bar order. Complete waits for the event date (Malaysia). */
export function actionsFor(b: CateringBookingAdmin): BookingAction[] {
  if (b.status === "PENDING") return ["approve", "decline", "cancel"];
  if (b.status === "APPROVED") return ["complete", "cancel"];
  return [];
}

export const canCompleteYet = (b: CateringBookingAdmin, today = klToday()) => b.eventDate <= today;

export const ACTION_LABEL: Record<BookingAction, string> = {
  approve: "Approve",
  decline: "Decline",
  cancel: "Cancel",
  complete: "Mark completed",
};

/** The quiet ok line after an action. */
export function doneMessage(kind: BookingAction, b: CateringBookingAdmin): string {
  const name = firstName(b.customerName);
  switch (kind) {
    case "approve":
      return `Approved. ${name} gets a confirmation email.`;
    case "decline":
      return `Declined. ${formatLong(b.eventDate)} is open again.`;
    case "cancel":
      return `Cancelled. ${formatLong(b.eventDate)} is open again.`;
    case "complete":
      return "Marked completed.";
  }
}

/** Errors the screen handles (role, race, gone); everything else stays inside the dialog. */
const isScreenError = (err: unknown) =>
  err instanceof ApiError && (err.status === 403 || err.status === 404 || err.code === "INVALID_STATE");

/**
 * The four status dialogs. `kind` null is closed. On success `onDone(updated, kind)`.
 * A 403, a 404 or INVALID_STATE closes the dialog and goes to `onFailed` (refetch, page Banner).
 * Validation and network errors stay in the dialog so the owner can fix and try again.
 */
export function BookingActionDialog({
  booking,
  kind,
  onClose,
  onDone,
  onFailed,
}: {
  booking: CateringBookingAdmin | null;
  kind: BookingAction | null;
  onClose: () => void;
  onDone: (updated: CateringBookingAdmin, kind: BookingAction) => void;
  onFailed: (err: unknown) => void;
}) {
  const { run, refreshPending } = useAdmin();
  const [quote, setQuote] = useState("");
  const [deposit, setDeposit] = useState("");
  const [reason, setReason] = useState("");
  const [markPaid, setMarkPaid] = useState(false);
  const [fieldErr, setFieldErr] = useState({ quote: "", deposit: "" });
  const [error, setError] = useState<{ title: string; help?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!kind || !booking) return;
    setQuote(booking.quoteAmount ? String(toCents(booking.quoteAmount)! / 100) : "");
    setDeposit(booking.depositAmount ? String(toCents(booking.depositAmount)! / 100) : "");
    setReason("");
    // A receipt is in: approving usually means the money arrived.
    setMarkPaid(booking.receipts.length > 0 && !booking.depositPaidAt);
    setFieldErr({ quote: "", deposit: "" });
    setError(null);
    // Reset when a dialog opens, not when the same booking re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, booking?.id]);

  if (!booking) return null;
  const date = formatLong(booking.eventDate);
  const name = booking.customerName;

  const confirm = async () => {
    if (!kind) return;
    let call: (token: string) => Promise<CateringBookingAdmin>;
    if (kind === "approve") {
      const q = toCents(quote);
      const d = toCents(deposit);
      const errs = amountsError(q, d);
      setFieldErr(errs);
      if (errs.quote || errs.deposit) return;
      const body: { quoteAmount?: number; depositAmount?: number; markPaid?: boolean } = {};
      if (q !== null) body.quoteAmount = centsToAmount(q);
      if (d !== null) body.depositAmount = centsToAmount(d);
      if (markPaid) body.markPaid = true;
      call = (t) => adminApprove(t, booking.id, body);
    } else if (kind === "decline") {
      call = (t) => adminDecline(t, booking.id, reason.trim() || undefined);
    } else if (kind === "cancel") {
      call = (t) => adminCancel(t, booking.id);
    } else {
      call = (t) => adminComplete(t, booking.id);
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await run(call);
      refreshPending();
      onDone(updated, kind);
    } catch (err) {
      if (isScreenError(err)) {
        onClose();
        onFailed(err);
      } else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const copy: Record<BookingAction, { title: string; body: string; yes: string; busy: string; no: string }> = {
    approve: {
      title: "Approve this booking?",
      body: `${name} gets a confirmation email for ${date}.`,
      yes: "Approve request",
      busy: "Approving",
      no: "Not yet",
    },
    decline: {
      title: "Decline this request?",
      body: `${date} opens up again and ${name} is told by email.`,
      yes: "Yes, decline it",
      busy: "Declining",
      no: "Keep it",
    },
    cancel: {
      title: booking.status === "PENDING" ? "Cancel this request?" : "Cancel this booking?",
      body: `${date} will open up for someone else. This cannot be undone.`,
      yes: "Yes, cancel it",
      busy: "Cancelling",
      no: "Keep the booking",
    },
    complete: {
      title: "Mark this completed?",
      body: `The event on ${date} is done. This cannot be undone.`,
      yes: "Mark completed",
      busy: "Saving",
      no: "Not yet",
    },
  };
  const c = copy[kind ?? "approve"];

  return (
    <Dialog
      open={!!kind}
      onClose={onClose}
      title={c.title}
      description={c.body}
      confirmLabel={c.yes}
      confirmLoading={busy}
      confirmLoadingLabel={c.busy}
      cancelLabel={c.no}
      onConfirm={confirm}
    >
      {error && (
        <Banner tone="error" title={error.title}>
          {error.help}
        </Banner>
      )}
      {kind === "approve" && (
        <div className="grid items-start gap-3 sm:grid-cols-2">
          <Field
            size="sm"
            label="Quote, RM"
            optional
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={quote}
            error={fieldErr.quote}
            onChange={(e) => setQuote(e.target.value)}
          />
          <Field
            size="sm"
            label="Deposit, RM"
            optional
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={deposit}
            error={fieldErr.deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
          {!booking.depositPaidAt && (
            <label className="col-span-full flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={markPaid}
                onChange={(e) => setMarkPaid(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[rgb(var(--ember))]"
              />
              <span>
                <b className="block">Payment received</b>
                <span className="text-cream-muted">
                  {booking.receipts.length
                    ? `I checked the receipt (${booking.paymentChoice === "FULL" ? "paid in full" : "half paid"}).`
                    : "No receipt uploaded yet. Tick only if the money is in."}
                </span>
              </span>
            </label>
          )}
        </div>
      )}
      {kind === "decline" && (
        <Field
          size="sm"
          label="Reason"
          optional
          help="The customer sees this on their status page."
          maxLength={500}
          autoComplete="off"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
    </Dialog>
  );
}
