"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ApiError, type CateringBookingStatus } from "@/lib/api";
import { cancelBooking } from "@/lib/catering-api";
import { brand, statusCopy, waLink } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import { Dialog } from "@/components/ui/dialog";

const linkClass = "font-semibold text-cream underline decoration-ember underline-offset-4";

// The status a cancel left behind; StatusFocus moves focus once the page shows a different one.
let focusAfter: CateringBookingStatus | null = null;

/**
 * Rendered by StatusTimeline beside its headline. It stays mounted across router.refresh(), so
 * when a cancel's refresh lands with the new status it focuses the new headline.
 */
export function StatusFocus({ status, headingId }: { status: CateringBookingStatus; headingId: string }) {
  useEffect(() => {
    if (!focusAfter || focusAfter === status) return;
    focusAfter = null;
    document.getElementById(headingId)?.focus();
  }, [status, headingId]);
  return null;
}

/** After the cutoff: no cancel button, a WhatsApp action instead. */
export function DeadlinePassed() {
  return (
    <div className="grid gap-1 rounded-card-sm border border-cream-faint bg-ink-raised px-[18px] py-4">
      <b className="font-semibold">{statusCopy.deadlinePassed}</b>
      <p className="type-small m-0 flex flex-wrap items-center gap-x-4 text-cream-muted">
        <span>
          WhatsApp <span className="select-all">{brand.whatsappDisplay}</span>
        </span>
        <a href={waLink()} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>
          {statusCopy.openWhatsapp}
        </a>
      </p>
    </div>
  );
}

/**
 * The customer's cancel: a ghost button, the cancel-by day, and the confirm Dialog naming the
 * date. The server is the judge: CANCEL_WINDOW_CLOSED switches to the deadline-passed state,
 * INVALID_STATE (changed meanwhile) reloads the page's current status.
 */
export function CancelBooking({
  token,
  kind,
  dateWords,
  cancelBy,
  status,
}: {
  token: string;
  /** The status shown now; focus moves to the headline once it changes. */
  status: CateringBookingStatus;
  kind: "request" | "booking";
  /** "Saturday 12 December 2026" */
  dateWords: string;
  /** Last day to cancel, "Saturday 5 December". */
  cancelBy: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [closed, setClosed] = useState(false);
  const d = statusCopy.dialog;

  const refresh = () => {
    focusAfter = status;
    startTransition(() => router.refresh());
  };

  async function confirm() {
    setBusy(true);
    setFailed(false);
    try {
      await cancelBooking(token);
      setOpen(false);
      refresh();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "CANCEL_WINDOW_CLOSED") {
        setOpen(false);
        setClosed(true);
      } else if (code === "INVALID_STATE") {
        setOpen(false);
        refresh();
      } else {
        setFailed(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (closed) return <DeadlinePassed />;

  return (
    <div className="grid justify-items-start gap-2">
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {kind === "request" ? statusCopy.cancelRequest : statusCopy.cancelBooking}
      </Button>
      <p className="type-small m-0 text-cream-muted">{statusCopy.cancelUntil(cancelBy)}</p>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setFailed(false);
        }}
        title={d.title(kind)}
        description={d.body(dateWords)}
        confirmLabel={d.yes}
        cancelLabel={d.no}
        confirmLoading={busy}
        confirmLoadingLabel={d.busy}
        onConfirm={() => void confirm()}
      >
        {failed && (
          <Banner tone="error" title={d.failed}>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Message us
            </a>
          </Banner>
        )}
      </Dialog>
    </div>
  );
}
