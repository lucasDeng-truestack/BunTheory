"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowRight, Flame, Clock, Moon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { getCanOrder, type CanOrderResponse } from "@/services/orders.service";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────
 * Batch status is the storefront's ordering gate. One provider polls
 * `/orders/can-order` and shares the result so the status band + every
 * batch-aware CTA on the page reflect the same live state without each
 * mounting its own poller. Ordering logic is untouched — this is presentation.
 * ──────────────────────────────────────────────────────────────────────── */

type BatchStatusValue = { status: CanOrderResponse | null; loading: boolean };

const BatchStatusContext = createContext<BatchStatusValue>({
  status: null,
  loading: true,
});

export function BatchStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CanOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getCanOrder()
        .then((c) => {
          if (!cancelled) {
            setStatus(c);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const value = useMemo(() => ({ status, loading }), [status, loading]);
  return <BatchStatusContext.Provider value={value}>{children}</BatchStatusContext.Provider>;
}

export function useBatchStatus(): BatchStatusValue {
  return useContext(BatchStatusContext);
}

/* ── Derived, human-readable display state ──────────────────────────────── */

type BatchState = "loading" | "open" | "full" | "closed" | "paused";

export type BatchDisplay = {
  state: BatchState;
  isOpen: boolean;
  eyebrow: string;
  headline: string;
  sub: string;
  /** e.g. "6:00 PM" — the active batch close time, when open. */
  orderBy: string | null;
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function deriveBatchDisplay({ status, loading }: BatchStatusValue): BatchDisplay {
  if (loading) {
    return {
      state: "loading",
      isOpen: false,
      eyebrow: "Batch status",
      headline: "Checking today's batch…",
      sub: "One sec while we see if the kitchen is taking orders.",
      orderBy: null,
    };
  }

  // Settled but no data (e.g. the API is unreachable) → degrade to a clear,
  // honest closed state rather than hanging on the "checking…" copy. The 60s
  // poll keeps retrying, so the band recovers automatically once it's back.
  if (!status) {
    return {
      state: "closed",
      isOpen: false,
      eyebrow: "Ordering closed",
      headline: "The next batch opens soon",
      sub: "We can't reach the kitchen right now — check back in a moment.",
      orderBy: null,
    };
  }

  if (status.canOrder && status.activeBatch) {
    const batch = status.activeBatch;
    const by = timeLabel(batch.closesAt);
    const name = batch.label?.trim();
    return {
      state: "open",
      isOpen: true,
      eyebrow: "Ordering is live",
      headline: name ? `${name} is live` : "This batch is live — order now",
      sub: `Closes at ${by} · fired for ${dateLabel(batch.fulfillmentDate)}.`,
      orderBy: by,
    };
  }

  switch (status.reason) {
    case "FULL":
      return {
        state: "full",
        isOpen: false,
        eyebrow: "Batch full",
        headline: "This batch is fully booked",
        sub: status.activeBatch
          ? `We hit capacity — the next window opens soon.`
          : "We hit capacity for now — the next window opens soon.",
        orderBy: null,
      };
    case "DISABLED":
      return {
        state: "paused",
        isOpen: false,
        eyebrow: "Ordering paused",
        headline: "Ordering is paused right now",
        sub: "We're taking a short break — check back shortly.",
        orderBy: null,
      };
    case "NO_BATCH":
    default:
      return {
        state: "closed",
        isOpen: false,
        eyebrow: "Ordering closed",
        headline: "The next batch opens soon",
        sub: "There's no live order window right now — check back to catch the next one.",
        orderBy: null,
      };
  }
}

/* ── Full-width status band (sits under the nav) ────────────────────────── */

/** Presentational band — render from any derived display (context or a passed status). */
export function BatchBandView({
  d,
  showCta = true,
  className,
}: {
  d: BatchDisplay;
  /** Show the "Order Now → /menu" pill when open. Off on the menu page itself. */
  showCta?: boolean;
  className?: string;
}) {
  const open = d.isOpen;

  return (
    <section
      className={cn(
        "w-full border-b-2 border-bun-ink/10",
        open ? "bg-bun-red text-white" : "bg-bun-black text-bun-cream",
        className
      )}
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-[1200px] min-w-0 flex-col items-center gap-3 px-4 py-3.5 text-center sm:flex-row sm:justify-between sm:gap-4 sm:px-6 sm:text-left">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              open ? "bg-white/15" : "bg-bun-cream/10"
            )}
            aria-hidden
          >
            {open ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bun-yellow opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bun-yellow" />
              </span>
            ) : d.state === "paused" ? (
              <Moon className="h-4 w-4" />
            ) : d.state === "full" ? (
              <Flame className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 max-w-full">
            <p
              className={cn(
                "font-display text-[0.7rem] font-semibold uppercase tracking-[0.18em]",
                open ? "text-bun-yellow" : "text-bun-yellow/90"
              )}
            >
              {d.eyebrow}
            </p>
            <p className="font-display text-base font-semibold leading-tight text-balance sm:text-lg">
              {d.headline}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className={cn("hidden text-sm sm:block", open ? "text-white/85" : "text-bun-cream/70")}>
            {d.sub}
          </p>
          {open && showCta && (
            <Button asChild variant="yellow" size="sm" className="shrink-0">
              <Link href="/menu">
                Order Now
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Context-bound band (landing) — polls via provider and renders {@link BatchBandView}. */
export function BatchStatusBand({ className }: { className?: string }) {
  const ctx = useBatchStatus();
  return <BatchBandView d={deriveBatchDisplay(ctx)} className={className} />;
}

/* ── Batch-aware primary CTA (hero / CTA band) ──────────────────────────── */

type BatchOrderButtonProps = {
  size?: ButtonProps["size"];
  className?: string;
  openLabel?: string;
  closedLabel?: string;
};

/**
 * Primary "Order Now" pill that reflects live batch state: a real link to the
 * menu when a batch is open, or a disabled pill with a closed label otherwise.
 */
export function BatchOrderButton({
  size = "lg",
  className,
  openLabel = "Order Now",
  closedLabel,
}: BatchOrderButtonProps) {
  const ctx = useBatchStatus();
  const d = deriveBatchDisplay(ctx);

  if (d.isOpen) {
    return (
      <Button asChild variant="hero" size={size} className={className}>
        <Link href="/menu">
          <Flame className="mr-2 h-5 w-5" />
          {openLabel}
        </Link>
      </Button>
    );
  }

  const label =
    closedLabel ??
    (d.state === "loading"
      ? "Checking batch…"
      : d.state === "paused"
        ? "Ordering paused"
        : d.state === "full"
          ? "Batch full"
          : "Ordering closed");

  return (
    <Button
      variant="hero"
      size={size}
      className={cn("cursor-not-allowed opacity-60 hover:translate-y-0", className)}
      disabled
      aria-disabled
    >
      {label}
    </Button>
  );
}
