export const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  PREPARING: "Preparing",
  READY: "Ready",
  DELIVERED: "Delivered",
};

export const ORDER_STATUS_STEPS = [
  "RECEIVED",
  "PREPARING",
  "READY",
  "DELIVERED",
] as const;
