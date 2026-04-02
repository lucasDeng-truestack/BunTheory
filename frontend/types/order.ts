export type OrderType = "PICKUP" | "DELIVERY";
export type OrderStatus = "RECEIVED" | "PREPARING" | "READY" | "DELIVERED";

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
  status: OrderStatus;
  createdAt: string;
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
