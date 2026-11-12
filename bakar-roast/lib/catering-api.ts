// Every backend call the Bakar & Roast site makes. Screens import from here, never call fetch.
// Types live in ./api (mirrors backend/src/modules/catering/catering.types.ts).
import {
  api,
  type CateringAvailability,
  type CateringBlockedDate,
  type CateringBookingAdmin,
  type CateringBookingCreated,
  type CateringBookingMine,
  type CateringBookingPublic,
  type CateringBookingStatus,
  type CateringCalendarDay,
  type CateringGalleryImagePublic,
  type CateringPackageAdmin,
  type CateringPackagePublic,
  type CateringPaymentChoice,
  type CateringPriceUnit,
  type CateringTestimonialPublic,
} from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3101";

const json = (method: string, body?: unknown, token?: string): RequestInit & { token?: string } => ({
  method,
  token,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : "";
};

// ─── Shapes not in ./api ─────────────────────────────────────────────────────

/** The four owner-set booking numbers. Print these inside copy; never hard-code them. */
export interface CateringRules {
  cateringMinNoticeDays: number;
  cateringBookingWindowMonths: number;
  cateringHoldExpiryDays: number;
  cateringCancelCutoffDays: number;
}

export interface CateringAdminSettings extends CateringRules {
  cateringNotifyEmail: string | null;
  cateringDailySets: number;
  cateringBankName: string | null;
  cateringBankAccountName: string | null;
  cateringBankAccountNumber: string | null;
  cateringPaymentQrUrl: string | null;
  cateringDeliveryStart: string;
  cateringDeliveryEnd: string;
}

export interface CreateBookingInput {
  eventDate: string; // YYYY-MM-DD
  serviceTime: string; // HH:mm
  packageId: string;
  guests: number;
  paymentChoice: CateringPaymentChoice;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  eventAddress: string;
  dietaryNotes?: string;
  notes?: string;
  /** Honeypot. Render a visually hidden input and send whatever it holds. */
  website?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: "OWNER" | "MANAGER" | "KITCHEN" | "CASHIER";
}

export interface PackageInput {
  name: string;
  tagline?: string;
  description: string;
  includes: string[];
  imageUrl?: string;
  minGuests: number;
  maxGuests?: number | null;
  price?: number | null;
  priceUnit?: CateringPriceUnit;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CateringGalleryImageAdmin extends CateringGalleryImagePublic {
  isActive: boolean;
  sortOrder: number;
}

export interface CateringTestimonialAdmin extends CateringTestimonialPublic {
  isActive: boolean;
  sortOrder: number;
}

// ─── Public ──────────────────────────────────────────────────────────────────

/** Public settings carry the four rule numbers (plus Bun Theory fields this site ignores). */
export const getCateringRules = () => api<CateringRules>("/settings", { next: { revalidate: 60 } });

export const getPackages = () =>
  api<CateringPackagePublic[]>("/catering/packages", { next: { revalidate: 60 } });

export const getGallery = () =>
  api<CateringGalleryImagePublic[]>("/catering/gallery", { next: { revalidate: 60 } });

export const getTestimonials = () =>
  api<CateringTestimonialPublic[]>("/catering/testimonials", { next: { revalidate: 60 } });

/** Always fresh: another customer may have just taken a date. */
export const getAvailability = (from?: string, to?: string) =>
  api<CateringAvailability>(`/catering/availability${qs({ from, to })}`);

/** Pass the customer's token when signed in so the booking is saved to their account. */
export const createBooking = (input: CreateBookingInput, customerToken?: string) =>
  api<CateringBookingCreated>("/catering/bookings", json("POST", input, customerToken || undefined));

export const getBooking = (accessToken: string) =>
  api<CateringBookingPublic>(`/catering/bookings/${encodeURIComponent(accessToken)}`);

/** Payment receipt from the booking page. JPG, PNG, WebP or PDF up to 5 MB. */
export function uploadReceipt(accessToken: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return api<CateringBookingPublic>(`/catering/bookings/${encodeURIComponent(accessToken)}/receipts`, {
    method: "POST",
    body,
  });
}

export const cancelBooking = (accessToken: string) =>
  api<CateringBookingPublic>(`/catering/bookings/${encodeURIComponent(accessToken)}/cancel`, json("POST"));

/** Signed-in customer only (token from lib/auth-client getAuthToken()). */
export const getMyBookings = (customerToken: string) =>
  api<CateringBookingMine[]>("/catering/me/bookings", { token: customerToken });

// ─── Admin (token from POST /auth/login) ─────────────────────────────────────

export const adminLogin = (email: string, password: string) =>
  api<{ accessToken: string; admin: AdminUser }>("/auth/login", json("POST", { email, password }));

export const adminListBookings = (
  token: string,
  params: { status?: CateringBookingStatus; from?: string; to?: string; take?: number } = {},
) => api<CateringBookingAdmin[]>(`/catering/admin/bookings${qs(params)}`, { token });

export const adminPendingCount = (token: string) =>
  api<{ count: number }>("/catering/admin/bookings/pending-count", { token });

export const adminGetBooking = (token: string, id: string) =>
  api<CateringBookingAdmin>(`/catering/admin/bookings/${id}`, { token });

export const adminApprove = (
  token: string,
  id: string,
  body: { quoteAmount?: number; depositAmount?: number; adminNotes?: string; markPaid?: boolean } = {},
) => api<CateringBookingAdmin>(`/catering/admin/bookings/${id}/approve`, json("PATCH", body, token));

export const adminDecline = (token: string, id: string, reason?: string) =>
  api<CateringBookingAdmin>(`/catering/admin/bookings/${id}/decline`, json("PATCH", { reason }, token));

export const adminCancel = (token: string, id: string) =>
  api<CateringBookingAdmin>(`/catering/admin/bookings/${id}/cancel`, json("PATCH", {}, token));

/** 409 EVENT_NOT_YET before the event date. */
export const adminComplete = (token: string, id: string) =>
  api<CateringBookingAdmin>(`/catering/admin/bookings/${id}/complete`, json("PATCH", {}, token));

/** null clears an amount; depositPaid / balancePaid stamp or clear the paid time. */
export const adminUpdateBooking = (
  token: string,
  id: string,
  body: {
    quoteAmount?: number | null;
    depositAmount?: number | null;
    depositPaid?: boolean;
    balancePaid?: boolean;
    adminNotes?: string;
  },
) => api<CateringBookingAdmin>(`/catering/admin/bookings/${id}`, json("PATCH", body, token));

/** from and to are required, at most 12 months apart. */
export const adminCalendar = (token: string, from: string, to: string) =>
  api<CateringCalendarDay[]>(`/catering/admin/calendar${qs({ from, to })}`, { token });

export const adminListBlocked = (token: string) =>
  api<CateringBlockedDate[]>("/catering/admin/blocked-dates", { token });

export const adminBlockDate = (token: string, date: string, reason?: string) =>
  api<CateringBlockedDate>("/catering/admin/blocked-dates", json("POST", { date, reason }, token));

export const adminUnblockDate = (token: string, date: string) =>
  api<{ date: string }>(`/catering/admin/blocked-dates/${date}`, json("DELETE", undefined, token));

/** Close every date from..to. Bookings already made stay. */
export const adminCloseDays = (token: string, from: string, to: string, reason?: string) =>
  api<CateringBlockedDate[]>("/catering/admin/days/close", json("POST", { from, to, reason }, token));

/** Open every date from..to again. */
export const adminOpenDays = (token: string, from: string, to: string) =>
  api<{ opened: number }>("/catering/admin/days/open", json("POST", { from, to }, token));

/** Delivery hours for every date from..to; null start and end go back to the usual hours. */
export const adminSetRangeHours = (token: string, from: string, to: string, start: string | null, end: string | null) =>
  api<{ updated: number }>("/catering/admin/days/hours", json("POST", { from, to, start, end }, token));

/** One day's sets and delivery hours. Leave a field out to keep it; null goes back to the default. */
export const adminSetDay = (
  token: string,
  date: string,
  body: { capacity?: number | null; deliveryStart?: string | null; deliveryEnd?: string | null },
) => api<{ date: string }>(`/catering/admin/days/${date}`, json("PATCH", body, token));

export const adminListPackages = (token: string) =>
  api<CateringPackageAdmin[]>("/catering/admin/packages", { token });

export const adminCreatePackage = (token: string, input: PackageInput) =>
  api<CateringPackageAdmin>("/catering/admin/packages", json("POST", input, token));

export const adminUpdatePackage = (token: string, id: string, input: Partial<PackageInput>) =>
  api<CateringPackageAdmin>(`/catering/admin/packages/${id}`, json("PATCH", input, token));

/** A package with bookings is hidden instead of deleted; then the row comes back with isActive false. */
export const adminDeletePackage = (token: string, id: string) =>
  api<{ id: string } | CateringPackageAdmin>(`/catering/admin/packages/${id}`, json("DELETE", undefined, token));

export const adminListGallery = (token: string) =>
  api<CateringGalleryImageAdmin[]>("/catering/admin/gallery", { token });

export const adminCreateGalleryImage = (
  token: string,
  input: { imageUrl: string; caption?: string; isActive?: boolean; sortOrder?: number },
) => api<CateringGalleryImageAdmin>("/catering/admin/gallery", json("POST", input, token));

export const adminUpdateGalleryImage = (
  token: string,
  id: string,
  input: Partial<{ imageUrl: string; caption: string; isActive: boolean; sortOrder: number }>,
) => api<CateringGalleryImageAdmin>(`/catering/admin/gallery/${id}`, json("PATCH", input, token));

export const adminDeleteGalleryImage = (token: string, id: string) =>
  api<{ id: string }>(`/catering/admin/gallery/${id}`, json("DELETE", undefined, token));

export const adminListTestimonials = (token: string) =>
  api<CateringTestimonialAdmin[]>("/catering/admin/testimonials", { token });

export const adminCreateTestimonial = (
  token: string,
  input: { quote: string; name: string; role?: string; isActive?: boolean; sortOrder?: number },
) => api<CateringTestimonialAdmin>("/catering/admin/testimonials", json("POST", input, token));

export const adminUpdateTestimonial = (
  token: string,
  id: string,
  input: Partial<{ quote: string; name: string; role: string; isActive: boolean; sortOrder: number }>,
) => api<CateringTestimonialAdmin>(`/catering/admin/testimonials/${id}`, json("PATCH", input, token));

export const adminDeleteTestimonial = (token: string, id: string) =>
  api<{ id: string }>(`/catering/admin/testimonials/${id}`, json("DELETE", undefined, token));

export const adminGetSettings = (token: string) =>
  api<CateringAdminSettings>("/settings/admin", { token });

/** 400 INVALID_RULES when minimum notice is not shorter than the booking window. */
export const adminUpdateSettings = (
  token: string,
  input: Partial<
    CateringRules & {
      cateringNotifyEmail: string;
      cateringDailySets: number;
      cateringBankName: string;
      cateringBankAccountName: string;
      cateringBankAccountNumber: string;
      cateringPaymentQrUrl: string;
      cateringDeliveryStart: string;
      cateringDeliveryEnd: string;
    }
  >,
) => api<CateringAdminSettings>("/settings/catering", json("PATCH", input, token));

/** Multipart upload. JPG, PNG or WebP up to 5 MB. Errors are ApiError like every other call. */
export function adminUploadImage(token: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return api<{ url: string }>("/uploads/image", { method: "POST", body, token });
}

/** Uploaded images may come back as "/uploads/x.jpg" (local disk) or a full URL (R2). */
export const imageSrc = (url: string | null | undefined) =>
  !url ? "" : url.startsWith("/") ? `${API_BASE}${url}` : url;
