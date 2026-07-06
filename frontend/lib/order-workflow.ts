import type { OrderStatus, OrderType } from "@/types/order";

/** Terminal states that leave the live board. */
export const TERMINAL_STATUSES: OrderStatus[] = [
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Linear fulfillment flow used for one-tap advance, by order type. */
function flowFor(type: OrderType): OrderStatus[] {
  return type === "DELIVERY"
    ? ["RECEIVED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"]
    : ["RECEIVED", "PREPARING", "READY", "PICKED_UP", "COMPLETED"];
}

/** Next status for the "advance" button, or null if already at the end. */
export function nextOrderStatus(
  type: OrderType,
  current: OrderStatus
): OrderStatus | null {
  const flow = flowFor(type);
  const idx = flow.indexOf(current);
  if (idx === -1 || idx >= flow.length - 1) return null;
  return flow[idx + 1];
}

/** Action label for advancing to the next status. */
export function advanceLabel(type: OrderType, current: OrderStatus): string | null {
  const next = nextOrderStatus(type, current);
  if (!next) return null;
  switch (next) {
    case "PREPARING":
      return "Start preparing";
    case "READY":
      return "Mark ready";
    case "OUT_FOR_DELIVERY":
      return "Out for delivery";
    case "PICKED_UP":
      return "Mark picked up";
    case "COMPLETED":
      return "Complete order";
    default:
      return "Advance";
  }
}

export type BoardColumn = {
  key: string;
  title: string;
  statuses: OrderStatus[];
};

/** Kanban columns for the live board (active orders only). */
export const BOARD_COLUMNS: BoardColumn[] = [
  { key: "new", title: "New", statuses: ["RECEIVED"] },
  { key: "preparing", title: "Preparing", statuses: ["PREPARING"] },
  { key: "ready", title: "Ready", statuses: ["READY"] },
  {
    key: "handover",
    title: "Out / Picked up",
    statuses: ["OUT_FOR_DELIVERY", "PICKED_UP"],
  },
];
