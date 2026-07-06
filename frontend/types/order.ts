export type OrderType = "PICKUP" | "DELIVERY";
export type OrderStatus =
  | "RECEIVED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "PICKED_UP"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentChoice = "PAY_LATER" | "PAY_NOW";

export interface OrderItem {
  id: string;
  menuId?: string;
  quantity: number;
  remarks?: string | null;
  unitPrice?: number | string;
  selectedOptions?: unknown;
  menu?: { name: string; price?: number | string };
}

export interface Order {
  id: string;
  slugId?: string;
  customerName: string;
  phone: string;
  type: OrderType;
  /** Present when type is DELIVERY */
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  status: OrderStatus;
  cancelledAt?: string | null;
  createdAt: string;
  /** "Comments for the restaurant" captured on the confirm screen. */
  restaurantComment?: string | null;
  /** Persisted money breakdown (null on legacy orders; fall back to line-item sum). */
  subtotal?: number | string | null;
  deliveryFee?: number | string | null;
  processingFee?: number | string | null;
  /** Tax already INCLUDED in `total`. */
  taxAmount?: number | string | null;
  total?: number | string | null;
  paymentChoice?: PaymentChoice;
  paymentReceiptUrl?: string | null;
  orderItems: OrderItem[];
  batchId?: string | null;
  batch?: {
    id: string;
    label: string | null;
    fulfillmentDate?: string;
    opensAt: string;
    closesAt: string;
  } | null;
}
