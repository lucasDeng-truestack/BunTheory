"use client";

import { CartValidator } from "@/components/order/cart-validator";

/**
 * Keeps persisted cart lines in sync with the live menu (stale menuIds after DB reset, etc.).
 */
export function CartSync() {
  return <CartValidator />;
}
