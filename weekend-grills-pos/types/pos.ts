export type PosMenuItemKind = 'MAIN_MEAL' | 'SIDE' | 'DRINK_ADDON';

export type PosServiceType = 'EAT_HERE' | 'TAKEAWAY';
export type PosPaymentMethod = 'CASH' | 'QR';
export type PosPaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'VOIDED';
export type PosOrderStatus = 'PLACED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type InventoryUnit = 'GRAM' | 'KG' | 'ML' | 'LITER' | 'PIECE' | 'PACK';
export type InventoryMovementType = 'PURCHASE' | 'SALE_USAGE' | 'WASTE' | 'ADJUSTMENT';

export interface PosCategory {
  id: string;
  name: string;
  sortOrder: number;
}

/** Staff subsection under Mains / Sides / Drinks (menu grid headings). */
export interface PosMenuSectionHeader {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string | null;
  sortOrder: number;
}

export interface PosMenuItem {
  id: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  kind: PosMenuItemKind;
  sectionHeaderId: string | null;
  sectionHeader: PosMenuSectionHeader | null;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PosOrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  menuItemDescription: string | null;
  menuItemImage: string | null;
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
  /** Returned when PATCH …/payment marks PAID — HMAC e-receipt QR token only. */
  receiptToken?: string;
}

/** Response from POST /pos/orders — includes signed token for optional e-receipt QR. */
export type PosOrderCreated = PosOrder & { receiptToken: string };

/** Public guest receipt from GET /pos/public/receipt?token=… (no auth). */
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
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    remarks: string | null;
  }>;
}

// ─── Cart ──────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  description: string | null;
  image: string | null;
  quantity: number;
  unitPrice: number;
  remarks: string;
  /** When set, grouped with other lines for the same meal combo in the POS cart UI. */
  mealBundleId?: string;
  /** Role within the meal; undefined for standalone lines. */
  mealLineKind?: 'MAIN' | 'SIDE' | 'DRINK_ADDON';
}

// ─── Inventory ─────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  unit: InventoryUnit;
  lowStockThreshold: number | null;
  currentStock: number;
  totalPurchased: number;
  totalCostPaid: number;
  avgUnitCost: number;
  isLowStock: boolean;
  createdAt: string;
}

export interface InventoryPurchase {
  id: string;
  itemId: string;
  itemName: string;
  unit: InventoryUnit;
  quantity: number;
  totalCost: number;
  unitCostAvg: number;
  supplierName: string | null;
  notes: string | null;
  purchasedAt: string;
}

// ─── Reports ───────────────────────────────────────────────────────────────

export interface DailySummary {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  cashRevenue: number;
  qrRevenue: number;
  eatHereOrders: number;
  takeawayOrders: number;
  topItems: Array<{ menuItemId: string; name: string; quantitySold: number }>;
}

export interface DashboardSummary {
  pipeline: { placed: number; preparing: number; ready: number };
  today: {
    completedOrders: number;
    totalRevenue: number;
    cashRevenue: number;
    qrRevenue: number;
  };
  topItems: Array<{ menuItemId: string; name: string; quantitySold: number }>;
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
