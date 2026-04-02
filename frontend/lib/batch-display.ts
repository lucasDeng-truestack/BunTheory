import type { CanOrderResponse } from "@/services/orders.service";

/** Subtitle for the kitchen load card (active batch name + window). */
export function formatBatchLabel(ctx: CanOrderResponse): string | null {
  const b = ctx.activeBatch;
  if (!b) {
    if (ctx.reason === "NO_BATCH") return "No batch open";
    return null;
  }
  const name = b.label?.trim() || "Order batch";
  const start = new Date(b.opensAt);
  const end = new Date(b.closesAt);
  const fmt: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  return `${name} · ${start.toLocaleTimeString(undefined, fmt)}–${end.toLocaleTimeString(undefined, fmt)}`;
}

export function checkoutClosedCopy(
  ctx: CanOrderResponse
): { title: string; description: string } {
  if (!ctx.canOrder && ctx.reason === "OK") {
    return {
      title: "Ordering paused",
      description:
        "The storefront is temporarily not accepting new orders. Try again later.",
    };
  }
  switch (ctx.reason) {
    case "FULL":
      return {
        title: "This batch is full",
        description:
          "We’ve reached the item limit for the current order window. Try the next batch or contact us on WhatsApp.",
      };
    case "DISABLED":
      return {
        title: "Ordering is turned off",
        description:
          "Ordering is temporarily disabled. Please check back later.",
      };
    case "NO_BATCH":
      return {
        title: "Ordering isn’t open yet",
        description:
          "There’s no active order batch right now. Come back when the next window is published.",
      };
    default:
      return {
        title: "Ordering unavailable",
        description: "Please try again later or return to the menu.",
      };
  }
}
