export type OrderType = "PICKUP" | "DELIVERY";
export type OrderStatus = "RECEIVED" | "PREPARING" | "READY" | "DELIVERED";

export interface OrderItem {
  id: string;
  menuId?: string;
  menuSnapshotItemId?: string;
  quantity: number;
  menu?: { name: string; price: number };
  menuSnapshotItem?: { name: string; price: number | string };
}

export interface Order {
  id: string;
  slugId?: string;
  customerName: string;
  phone: string;
  type: OrderType;
  status: OrderStatus;
  createdAt: string;
  batchId?: string | null;
  batch?: {
    id: string;
    label: string | null;
    fulfillmentDate: string;
  } | null;
  orderItems: OrderItem[];
}
