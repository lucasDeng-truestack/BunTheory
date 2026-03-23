/** Persisted so `/order/success` can recover when the `?id=` query is missing. */
export const LAST_ORDER_STORAGE_KEY = "bun-theory-last-order-id";

export function saveLastOrderId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_ORDER_STORAGE_KEY, id);
  } catch {
    /* quota / private mode */
  }
}

export function getLastOrderId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
}
