import { toAmount } from "./money";

/**
 * Money breakdown for an order. Tax is **inclusive** (MY SST style): the quoted
 * subtotal + fees already contain the tax, so `taxAmount` is the portion baked
 * into `total`, not an amount added on top.
 *
 * The backend (`orders.service.create`) persists the same fields; this keeps the
 * customer-facing confirm screen and the stored order in agreement.
 */

export const DEFAULT_TAX_RATE_PERCENT = 6;

export interface OrderTotalsInput {
  subtotal: number | string | null | undefined;
  deliveryFee?: number | string | null;
  processingFee?: number | string | null;
  /** Defaults to 6 (SST). Pass 0 to disable tax display. */
  taxRatePercent?: number | string | null;
}

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  processingFee: number;
  taxRatePercent: number;
  /** Tax portion ALREADY INCLUDED in `total`. */
  taxAmount: number;
  total: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = toAmount(input.subtotal);
  const deliveryFee = toAmount(input.deliveryFee);
  const processingFee = toAmount(input.processingFee);
  const rate =
    input.taxRatePercent == null
      ? DEFAULT_TAX_RATE_PERCENT
      : toAmount(input.taxRatePercent);

  const total = round2(subtotal + deliveryFee + processingFee);
  // Inclusive-tax extraction: tax = total - total / (1 + rate/100).
  const taxAmount = rate > 0 ? round2((total * rate) / (100 + rate)) : 0;

  return {
    subtotal,
    deliveryFee,
    processingFee,
    taxRatePercent: rate,
    taxAmount,
    total,
  };
}
