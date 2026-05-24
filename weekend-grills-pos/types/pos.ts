export type PosProductType = 'COMBO' | 'VARIANT' | 'SIMPLE';
export type PosOrderLineType = 'COMBO' | 'VARIANT' | 'SIMPLE';

const POS_PRODUCT_TYPE_LABELS: Record<PosProductType, string> = {
  SIMPLE: 'Simple',
  VARIANT: 'Variant',
  COMBO: 'Combo',
};

export function formatPosProductType(type: PosProductType): string {
  return POS_PRODUCT_TYPE_LABELS[type];
}

export const POS_PRODUCT_TYPE_OPTIONS: Array<{
  value: PosProductType;
  label: string;
}> = (['SIMPLE', 'VARIANT', 'COMBO'] as const).map((value) => ({
  value,
  label: POS_PRODUCT_TYPE_LABELS[value],
}));

export type PosServiceType = 'EAT_HERE' | 'TAKEAWAY';
export type PosPaymentMethod = 'CASH' | 'QR';
export type PosPaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'VOIDED';
export type PosOrderStatus = 'PLACED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface PosComboSlotOption {
  id: string;
  label: string;
  priceDelta: number;
  sortOrder: number;
}

export interface PosComboSlot {
  id: string;
  label: string;
  sortOrder: number;
  required: boolean;
  options: PosComboSlotOption[];
}

export interface PosComboConfig {
  id: string;
  includesText: string | null;
  slots: PosComboSlot[];
}

export interface PosProductVariant {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
}

export interface PosProduct {
  id: string;
  sectionId: string;
  type: PosProductType;
  name: string;
  description: string | null;
  image: string | null;
  basePrice: number;
  available: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  combo: PosComboConfig | null;
  variants: PosProductVariant[];
}

export interface PosMenuSection {
  id: string;
  name: string;
  sortOrder: number;
  products: PosProduct[];
}

export interface PosOrderItem {
  id: string;
  lineType: PosOrderLineType;
  productId: string | null;
  variantId: string | null;
  displayName: string;
  choicesSummary: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  remarks: string | null;
}

export interface PosOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  serviceType: PosServiceType;
  status: PosOrderStatus;
  paymentMethod: PosPaymentMethod;
  paymentStatus: PosPaymentStatus;
  subtotal: number;
  total: number;
  notes: string | null;
  createdBy: { id: string; email: string; displayName: string | null } | null;
  paidBy: { id: string; email: string; displayName: string | null } | null;
  paidAt: string | null;
  startedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items: PosOrderItem[];
  receiptToken?: string;
}

export type PosOrderCreated = PosOrder & { receiptToken: string };

export interface PublicPosReceipt {
  orderNumber: string;
  customerName: string;
  serviceType: PosServiceType;
  paymentMethod: PosPaymentMethod;
  paymentStatus: PosPaymentStatus;
  subtotal: number;
  tip: number;
  total: number;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  items: Array<{
    name: string;
    choicesSummary: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    remarks: string | null;
  }>;
}

export interface ComboSelection {
  slotId: string;
  optionId: string;
}

export interface CartItem {
  id: string;
  lineType: PosOrderLineType;
  productId: string;
  variantId?: string;
  displayName: string;
  choicesSummary?: string;
  comboSelections?: ComboSelection[];
  quantity: number;
  unitPrice: number;
  remarks: string;
}

export interface PosPurchase {
  id: string;
  remark: string;
  amount: number;
  purchasedAt: string;
  createdAt: string;
  createdBy: { id: string; email: string; displayName: string | null } | null;
}

export interface DailySummary {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  cashRevenue: number;
  qrRevenue: number;
  eatHereOrders: number;
  takeawayOrders: number;
  topItems: Array<{ productId: string | null; name: string; quantitySold: number }>;
}

export interface DashboardSummary {
  pipeline: { placed: number; preparing: number; ready: number };
  today: {
    completedOrders: number;
    totalRevenue: number;
    cashRevenue: number;
    qrRevenue: number;
  };
  topItems: Array<{ productId: string | null; name: string; quantitySold: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    status: PosOrderStatus;
    serviceType: PosServiceType;
    paymentMethod: PosPaymentMethod;
    total: number;
    createdAt: string;
    itemsSummary: string;
  }>;
}
