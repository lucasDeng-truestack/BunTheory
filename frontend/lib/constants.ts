export const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  PICKED_UP: "Picked up",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_STEPS = [
  "RECEIVED",
  "PREPARING",
  "READY",
  "DELIVERED",
] as const;

/** Every status, for admin status pickers (board uses the workflow helpers instead). */
export const ALL_ORDER_STATUSES = [
  "RECEIVED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "PICKED_UP",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;
