import { ShopFulfilmentType, ShopOrderStatus, ShopPaymentChoice } from '@prisma/client';

/** GET /shop/config — the static parts the /order page needs before any order exists. */
export type ShopConfigPublic = {
  packages: {
    key: string;
    name: string;
    tagline: string;
    description: string;
    includes: string[];
    /** Photos, cover first. Empty until the owner adds some. */
    images: string[];
    /** Decimal string with two places, e.g. "88.00". */
    price: string;
  }[];
  pickupArea: string;
  /** Inclusive YYYY-MM-DD bounds for the fulfilment date. */
  minDate: string;
  maxDate: string;
  /** Default serving window, on the hour. A day can override it (see availability). */
  defaultHours: { start: string; end: string };
  /** False while pre-orders have not opened yet; then `ordersOpenDate` is when they do. */
  ordersOpen: boolean;
  ordersOpenDate: string | null;
};

/** One package as the owner sees it in the admin, hidden ones included. */
export type ShopPackageAdmin = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  includes: string[];
  images: string[];
  /** Decimal string with two places, e.g. "88.00". */
  price: string;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
};

/** One open fulfilment date with the exact time slots offered on it. */
export type ShopAvailabilityDay = {
  date: string;
  /** "HH:00-HH:00" windows, resolved from that day's serving hours. Never empty. */
  slots: string[];
};

/**
 * GET /shop/availability — the live, uncached picture the date/time picker needs: which dates
 * are open and, for each, the slots on offer. Closed or serve-nothing days are left out.
 */
export type ShopAvailabilityPublic = {
  minDate: string;
  maxDate: string;
  ordersOpen: boolean;
  ordersOpenDate: string | null;
  days: ShopAvailabilityDay[];
};

/** One owner-set day override, for the admin schedule screen. `note` is owner-only. */
export type ShopScheduleDay = {
  date: string;
  closed: boolean;
  note: string | null;
  serveStart: string | null;
  serveEnd: string | null;
};

/** GET /shop/admin/schedule — the live rules plus every upcoming owner-set day. */
export type ShopSchedule = {
  earliestDate: string;
  ordersOpenDate: string | null;
  minNoticeDays: number;
  windowDays: number;
  defaultHours: { start: string; end: string };
  /** Length of one time slot, in minutes. */
  slotMinutes: number;
  minDate: string;
  maxDate: string;
  days: ShopScheduleDay[];
};

export type ShopOrderItemView = {
  packageKey: string;
  packageName: string;
  unitPrice: string;
  quantity: number;
};

export type ShopReceiptView = {
  id: string;
  fileUrl: string;
  fileName: string | null;
  createdAt: string;
};

/** The public order page (keyed by accessToken). The single source of truth after checkout. */
export type ShopOrderPublic = {
  reference: string;
  accessToken: string;
  status: ShopOrderStatus;
  type: ShopFulfilmentType;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postcode: string;
    country: 'Malaysia';
    notes: string | null;
  } | null;
  pickupArea: string | null;
  fulfilmentDate: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  items: ShopOrderItemView[];
  subtotal: string;
  total: string;
  paymentChoice: ShopPaymentChoice;
  amountDue: string;
  depositPaidAt: string | null;
  fullyPaidAt: string | null;
  receipts: ShopReceiptView[];
  createdAt: string;
};

/** What POST /shop/orders returns: just enough to redirect to the order page. */
export type ShopOrderCreated = {
  reference: string;
  accessToken: string;
};

/** Admin list row. */
export type ShopOrderAdmin = ShopOrderPublic & {
  id: string;
  adminNotes: string | null;
  updatedAt: string;
};
