"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, ArrowRight } from "lucide-react";
import { getCanOrder, type CanOrderResponse } from "@/services/orders.service";
import { cn } from "@/lib/utils";

/** Active batch close time in the visitor's locale, e.g. "6:00 PM". */
function closeTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type StripContent = { tone: "live" | "muted"; text: string; cta: boolean };

/** Promo copy derived from the storefront/batch context. */
function buildStrip(ctx: CanOrderResponse | null): StripContent {
  if (!ctx) {
    return { tone: "muted", text: "Fire-roasted buns, made to order.", cta: false };
  }

  if (ctx.canOrder && ctx.activeBatch) {
    const by = closeTimeLabel(ctx.activeBatch.closesAt);
    const label = ctx.activeBatch.label?.trim();
    return {
      tone: "live",
      text: label
        ? `${label} is live — order by ${by}`
        : `This week's batch is live — order by ${by}`,
      cta: true,
    };
  }

  switch (ctx.reason) {
    case "FULL":
      return {
        tone: "muted",
        text: ctx.activeBatch
          ? `Today's batch is full — closes ${closeTimeLabel(
              ctx.activeBatch.closesAt
            )}. Next window soon.`
          : "Today's batch is full — check back for the next window.",
        cta: false,
      };
    case "NO_BATCH":
      return {
        tone: "muted",
        text: "Next order window coming soon — check back!",
        cta: false,
      };
    case "DISABLED":
      return {
        tone: "muted",
        text: "Ordering is paused right now — back shortly.",
        cta: false,
      };
    default:
      return {
        tone: "muted",
        text: "Fire-roasted buns, made to order.",
        cta: false,
      };
  }
}

/**
 * Thin announcement bar under the header. Polls `can-order` so the live state
 * and "order by" time (from the active batch's close time) stay current.
 */
export function BatchPromoStrip() {
  const [ctx, setCtx] = useState<CanOrderResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getCanOrder()
        .then((c) => {
          if (!cancelled) setCtx(c);
        })
        .catch(() => {
          /* keep neutral default on failure */
        });
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const strip = buildStrip(ctx);
  const live = strip.tone === "live";

  return (
    <Link
      href="/menu"
      aria-label={strip.text}
      className={cn(
        "group flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium transition-colors",
        live
          ? "bg-deep-red text-white hover:bg-deep-red/95"
          : "bg-mustard/15 text-burnt-brown hover:bg-mustard/25"
      )}
      style={{ letterSpacing: "0.01em" }}
    >
      {live ? (
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mustard opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-mustard" />
        </span>
      ) : (
        <Flame className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span className="font-medium">{strip.text}</span>
      {strip.cta ? (
        <ArrowRight
          className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}
