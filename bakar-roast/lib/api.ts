const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3101";

/** Carries the HTTP status and the backend's `code` (e.g. "DATE_TAKEN") so UI can branch on it. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options?: RequestInit & { token?: string; next?: NextFetchRequestConfig }
): Promise<T> {
  const { token, next, ...init } = options || {};
  const headers: HeadersInit = {
    // FormData sets its own multipart boundary.
    ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    // Default to no-store, but when a caller opts into ISR via `next`
    // (e.g. { revalidate }) let Next control caching instead.
    cache: init.cache ?? (next ? undefined : "no-store"),
    ...init,
    ...(next ? { next } : {}),
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const raw = err?.message ?? err?.error;
    const message = Array.isArray(raw) ? raw.join(" ") : String(raw || res.statusText);
    throw new ApiError(message || "Request failed", res.status, err?.code);
  }
  // Some endpoints (e.g. DELETE /batches/:id) answer 200 with no body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ─── Catering contract. Mirrors backend/src/modules/catering/catering.types.ts ───

export type CateringBookingStatus =
  | "PENDING"
  | "APPROVED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED"
  | "COMPLETED";

export interface CateringPackagePublic {
  id: string;
  name: string;
  tagline: string | null;
  description: string;
  includes: string[];
  imageUrl: string | null;
  minGuests: number;
  maxGuests: number | null;
  /** Decimal string, e.g. "45.00". Null = quoted after the request. */
  price: string | null;
  priceUnit: CateringPriceUnit;
}

export type CateringPriceUnit = "PER_SET" | "PER_PAX";
export type CateringPaymentChoice = "DEPOSIT" | "FULL";

export interface CateringPaymentDetails {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  qrUrl: string | null;
}

export interface CateringReceipt {
  id: string;
  fileUrl: string;
  fileName: string | null;
  createdAt: string;
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
  /** Sets still open on dates with 3 or fewer left. */
  fewLeft?: Record<string, number>;
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
  totalAmount: string | null;
  /** What to pay now: half, or the total. */
  amountDue: string | null;
  paymentChoice: CateringPaymentChoice;
  depositPaidAt: string | null;
  balancePaidAt: string | null;
  receipts: CateringReceipt[];
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
  receipts: CateringReceipt[];
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

/** Admin calendar: every date that is closed, has its own number of sets, or has bookings. */
export interface CateringCalendarDay {
  date: string;
  closed: boolean;
  reason: string | null;
  capacity: number;
  customCapacity: boolean;
  bookings: Array<{
    id: string;
    reference: string;
    status: "PENDING" | "APPROVED" | "COMPLETED";
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
