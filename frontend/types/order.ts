export type OrderType = "PICKUP" | "DELIVERY";
export type OrderStatus = "RECEIVED" | "PREPARING" | "READY" | "DELIVERED";

export interface OrderItem {
  id: string;
  menuId: string;
  quantity: number;
  menu?: { name: string; price: number };
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
}
