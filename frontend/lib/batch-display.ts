import type { CanOrderResponse } from "@/services/orders.service";

export function formatBatchLabel(ctx: CanOrderResponse): string | null {
  if (ctx.label?.trim()) return ctx.label.trim();
  if (!ctx.fulfillmentDate) return null;
  try {
    const d = new Date(ctx.fulfillmentDate);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
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
    case "SOLD_OUT":
      return {
        title: "This batch is full",
        description:
          "We can’t take more orders for this release. Try again when the next batch opens.",
      };
    case "BEFORE_OPEN":
      return {
        title: "Ordering isn’t open yet",
        description: "Come back when the batch window opens.",
      };
    case "NO_BATCH":
    case "NOT_PUBLISHED":
      return {
        title: "No active ordering window",
        description:
          "There isn’t a published batch right now. Check the menu page for updates.",
      };
    case "AFTER_CLOSE":
    case "CLOSED":
      return {
        title: "Ordering closed for this batch",
        description: "This release has ended. Watch for the next drop.",
      };
    default:
      return {
        title: "Ordering unavailable",
        description: "Please try again later or return to the menu.",
      };
  }
}
