/** sessionStorage draft for resuming the payment modal after refresh or app switch. */
export const CHECKOUT_PAYMENT_DRAFT_KEY = "bun-theory.checkout-payment-draft";

export type CheckoutPaymentDraftV1 = {
  v: 1;
  step: "choice" | "confirm" | "payNow";
  selectedMethod: "payNow" | "payLater" | null;
  fileMeta: { name: string } | null;
};
