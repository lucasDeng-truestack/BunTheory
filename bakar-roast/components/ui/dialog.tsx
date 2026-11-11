"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Confirmation dialog for actions that cannot be undone. Built on native <dialog> + showModal,
 * so focus is trapped and Escape closes it. Controlled: `open` + `onClose`.
 * - Title in display-sm, one or two plain sentences in `description`, optional extra
 *   content (a reason field, quote and deposit) in `children`.
 * - Two actions: `confirmLabel` (cream, no chip; never ember) and `cancelLabel` (ghost).
 *   Name what happens: "Yes, cancel it" / "Keep my booking".
 * - Bottom sheet under 640px. Fades in over 0.2s (no motion under reduced motion).
 * - Focus returns to the element that opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmLoading = false,
  confirmLoadingLabel,
  confirmDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  onConfirm: () => void;
  confirmLoading?: boolean;
  confirmLoadingLabel?: ReactNode;
  confirmDisabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const safe = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  // A drag that starts inside the panel and ends on the scrim must not close it.
  const pressedScrim = useRef(false);
  const lenis = useLenis();
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement as HTMLElement | null;
      el.showModal();
      // Focus lands on the safe choice, not the irreversible one.
      safe.current?.focus();
      lenis?.stop();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open, lenis]);

  // Runs for every way the dialog closes: restore page scroll and focus.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onNativeClose = () => {
      lenis?.start();
      opener.current?.focus?.();
      opener.current = null;
    };
    el.addEventListener("close", onNativeClose);
    return () => {
      el.removeEventListener("close", onNativeClose);
      // Unmounted while open: close never fires, so restart page scroll here.
      if (el.open) lenis?.start();
    };
  }, [lenis]);

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      data-tone="ink"
      data-lenis-prevent
      onCancel={(e) => {
        // Escape: keep the dialog controlled by the parent.
        e.preventDefault();
        if (!confirmLoading) onClose();
      }}
      onKeyDown={(e) => {
        // showModal() lets Tab leave to the browser chrome once; wrap it inside the dialog instead.
        if (e.key !== "Tab") return;
        const items = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])"),
        ).filter((el) => !el.matches(":disabled") && el.getClientRects().length > 0);
        const first = items[0];
        const last = items[items.length - 1];
        if (!first) return;
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }}
      onPointerDown={(e) => {
        pressedScrim.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // A click on the scrim (the dialog element itself, outside the panel) is the safe choice.
        if (e.target === e.currentTarget && pressedScrim.current && !confirmLoading) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-48px)] max-w-[420px] overflow-visible bg-transparent p-0 text-cream",
        "backdrop:bg-ink/70 open:animate-fade-in open:backdrop:animate-fade-in",
        "max-sm:mb-0 max-sm:w-full max-sm:max-w-none",
      )}
    >
      <div
        className={cn(
          "grid gap-4 rounded-card-md border border-ink-line bg-ink-raised p-7",
          "max-sm:rounded-b-none max-sm:pb-[max(28px,env(safe-area-inset-bottom))]",
        )}
      >
        <h2 id={titleId} className="display-sm m-0">
          {title}
        </h2>
        {description && (
          <p id={descId} className="m-0 text-cream-muted">
            {description}
          </p>
        )}
        {children}
        <div className="mt-2 flex flex-wrap gap-3">
          <Button
            variant="cream"
            chip={false}
            // Loading does not disable the button (it keeps its label readable), so guard here.
            onClick={() => {
              if (!confirmLoading) onConfirm();
            }}
            loading={confirmLoading}
            loadingLabel={confirmLoadingLabel}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
          <Button ref={safe} variant="ghost" onClick={onClose} disabled={confirmLoading}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
