import {
  CateringBookingStatus,
  CateringPaymentChoice,
  CateringPriceUnit,
} from '@prisma/client';

/** Response shapes for the catering API. Mirrored in bakar-roast/lib/api.ts. */

export interface CateringPackagePublic {
  id: string;
  name: string;
  tagline: string | null;
  description: string;
  includes: string[];
  imageUrl: string | null;
  minGuests: number;
  maxGuests: number | null;
  /** Decimal as string, e.g. "45.00". Null = quoted after the request. */
  price: string | null;
  priceUnit: CateringPriceUnit;
}

export interface CateringPackageAdmin extends CateringPackagePublic {
  isActive: boolean;
  sortOrder: number;
}

/** Dates are YYYY-MM-DD, Malaysia local. `unavailable` (closed or full) never says why. */
export interface CateringAvailability {
  minDate: string;
  maxDate: string;
  unavailable: string[];
  /** Sets still open on dates with few left (3 or fewer), for a "2 left" hint. */
  fewLeft: Record<string, number>;
  /** Delivery hours, "HH:mm": the usual ones, and days that differ. */
  hours: { start: string; end: string };
  dayHours: Record<string, { start: string; end: string }>;
}

/** How the customer pays: shown on their booking page. */
export interface CateringPaymentDetails {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  qrUrl: string | null;
}

export interface CateringReceiptView {
  id: string;
  fileUrl: string;
  fileName: string | null;
  createdAt: string;
}

export interface CateringBookingCreated {
  reference: string;
  accessToken: string;
  status: CateringBookingStatus;
  eventDate: string;
  holdExpiresAt: string | null;
}

/** Customer status page. No admin notes, no accessToken echo. */
export interface CateringBookingPublic {
  reference: string;
  status: CateringBookingStatus;
  eventDate: string;
  /** Delivery time, HH:mm. */
  serviceTime: string;
  packageName: string;
  guests: number;
  occasion: string | null;
  /** Total for the order, decimal string. Null until priced. */
  totalAmount: string | null;
  /** What to pay now: half or the total. Null until priced. */
  amountDue: string | null;
  paymentChoice: CateringPaymentChoice;
  depositPaidAt: string | null;
  balancePaidAt: string | null;
  receipts: CateringReceiptView[];
  payment: CateringPaymentDetails;
  customerName: string;
  eventAddress: string;
  declineReason: string | null;
  holdExpiresAt: string | null;
  createdAt: string;
  canCancel: boolean;
  /** Last Malaysia-local date the customer may still cancel, YYYY-MM-DD. */
  cancelDeadline: string;
}

/** A signed-in customer's own booking: the public view plus the link token for its status page. */
export interface CateringBookingMine extends CateringBookingPublic {
  accessToken: string;
  /** The customer's own number, used to prefill their next booking. */
  customerPhone: string;
}

export interface CateringBookingAdmin {
  id: string;
  reference: string;
  status: CateringBookingStatus;
  eventDate: string;
  serviceTime: string;
  packageId: string;
  packageName: string;
  guests: number;
  occasion: string | null;
  paymentChoice: CateringPaymentChoice;
  receipts: CateringReceiptView[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  eventAddress: string;
  dietaryNotes: string | null;
  notes: string | null;
  /** Decimal as string, e.g. "1250.00". */
  quoteAmount: string | null;
  depositAmount: string | null;
  depositPaidAt: string | null;
  balancePaidAt: string | null;
  adminNotes: string | null;
  declineReason: string | null;
  holdExpiresAt: string | null;
  decidedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CateringBlockedDate {
  date: string;
  reason: string | null;
}

/** Admin calendar: every date that is closed, has a custom capacity, or has bookings. */
export interface CateringCalendarDay {
  date: string;
  closed: boolean;
  /** Why it is closed (owner note). */
  reason: string | null;
  /** Sets taken this day (custom or the default). */
  capacity: number;
  /** True when the owner set this day's capacity. */
  customCapacity: boolean;
  /** This day's delivery hours (its own, or the usual ones). */
  deliveryStart: string;
  deliveryEnd: string;
  customHours: boolean;
  /** Pending, approved and completed bookings on this day. */
  bookings: Array<{
    id: string;
    reference: string;
    status: 'PENDING' | 'APPROVED' | 'COMPLETED';
    customerName: string;
    serviceTime: string;
  }>;
}

export interface CateringGalleryImagePublic {
  id: string;
  imageUrl: string;
  caption: string | null;
}

export interface CateringTestimonialPublic {
  id: string;
  quote: string;
  name: string;
  role: string | null;
}
