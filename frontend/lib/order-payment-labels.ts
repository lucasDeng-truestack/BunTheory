import type { Order } from "@/types/order";

export function paymentChoiceLabel(order: Order): string {
  if (order.paymentChoice === "PAY_NOW") return "Pay now";
  if (order.paymentChoice === "PAY_LATER") return "Pay later";
  return "—";
}

/** Receipt upload status for display (Pay later → not applicable). */
export function receiptStatusLabel(order: Order): string {
  if (order.paymentChoice === "PAY_LATER") return "N/A";
  if (order.paymentChoice === "PAY_NOW") {
    return order.paymentReceiptUrl?.trim() ? "Received" : "Awaiting receipt";
  }
  return "—";
}
