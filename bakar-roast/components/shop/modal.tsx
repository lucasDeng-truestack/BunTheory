"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A plain modal for the order flow (the delivery-or-pickup question, package details). Built on
 * native <dialog> + showModal like ui/dialog, so focus is trapped and Escape closes it, but with
 * free content instead of the confirm/cancel pair. Bottom sheet under 640px; the panel scrolls
 * when its content is taller than the screen. Page scroll is paused while it is open.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // A drag that starts inside the panel and ends on the scrim must not close it.
  const pressedScrim = useRef(false);
  const lenis = useLenis();
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement as HTMLElement | null;
      el.showModal();
      lenis?.stop();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open, lenis]);

  // Runs for every way the modal closes: restore page scroll and focus.
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
      if (el.open) lenis?.start();
    };
  }, [lenis]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-tone="ink"
      data-lenis-prevent
      onCancel={(e) => {
        // Escape: keep the modal controlled by the parent.
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => {
        pressedScrim.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedScrim.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-48px)] overflow-visible bg-transparent p-0 text-cream",
        wide ? "max-w-[720px]" : "max-w-[520px]",
        "backdrop:bg-ink/70 open:animate-fade-in open:backdrop:animate-fade-in",
        "max-sm:mb-0 max-sm:w-full max-sm:max-w-none",
      )}
    >
      <div
        className={cn(
          "relative grid max-h-[88dvh] gap-5 overflow-y-auto overscroll-contain rounded-card-md border border-ink-line bg-ink-raised p-7",
          "max-sm:rounded-b-none max-sm:p-5 max-sm:pb-[max(24px,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            {eyebrow && <p className="type-eyebrow m-0 text-cream-faint">{eyebrow}</p>}
            <h2 id={titleId} className="display-sm m-0">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-cream-muted hover:text-cream"
          >
            <X aria-hidden size={20} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
