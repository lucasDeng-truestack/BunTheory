import {
  CateringBooking,
  CateringGalleryImage,
  CateringPackage,
  CateringReceipt,
  CateringTestimonial,
  Prisma,
} from '@prisma/client';
import { addDays, fromDateOnly, klToday } from './catering.dates';
import {
  CateringBookingAdmin,
  CateringBookingCreated,
  CateringBookingMine,
  CateringBookingPublic,
  CateringGalleryImagePublic,
  CateringPaymentDetails,
  CateringReceiptView,
  CateringPackageAdmin,
  CateringPackagePublic,
  CateringTestimonialPublic,
} from './catering.types';

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const money = (v: Prisma.Decimal | null): string | null =>
  v != null ? v.toFixed(2) : null;

export function toPackagePublic(p: CateringPackage): CateringPackagePublic {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    includes: p.includes,
    imageUrl: p.imageUrl,
    minGuests: p.minGuests,
    maxGuests: p.maxGuests,
    price: money(p.price),
    priceUnit: p.priceUnit,
  };
}

/** A booking with its receipts loaded (receipts may be omitted where not needed). */
export type BookingRow = CateringBooking & { receipts?: CateringReceipt[] };

const toReceipt = (r: CateringReceipt): CateringReceiptView => ({
  id: r.id,
  fileUrl: r.fileUrl,
  fileName: r.fileName,
  createdAt: r.createdAt.toISOString(),
});

const receiptsOf = (b: BookingRow) =>
  [...(b.receipts ?? [])]
    .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
    .map(toReceipt);

export function toPackageAdmin(p: CateringPackage): CateringPackageAdmin {
  return { ...toPackagePublic(p), isActive: p.isActive, sortOrder: p.sortOrder };
}

export function toBookingCreated(b: CateringBooking): CateringBookingCreated {
  return {
    reference: b.reference,
    accessToken: b.accessToken,
    status: b.status,
    eventDate: fromDateOnly(b.eventDate),
    holdExpiresAt: iso(b.holdExpiresAt),
  };
}

/** Last KL date the customer may cancel: eventDate minus the cutoff. */
export function cancelDeadlineOf(b: CateringBooking, cutoffDays: number): string {
  return addDays(fromDateOnly(b.eventDate), -cutoffDays);
}

export function canCustomerCancel(
  b: CateringBooking,
  cutoffDays: number,
): boolean {
  return (
    (b.status === 'PENDING' || b.status === 'APPROVED') &&
    klToday() <= cancelDeadlineOf(b, cutoffDays)
  );
}

export function toBookingPublic(
  b: BookingRow,
  cutoffDays: number,
  payment: CateringPaymentDetails,
): CateringBookingPublic {
  return {
    reference: b.reference,
    status: b.status,
    eventDate: fromDateOnly(b.eventDate),
    serviceTime: b.serviceTime,
    packageName: b.packageName,
    guests: b.guests,
    occasion: b.occasion,
    totalAmount: money(b.quoteAmount),
    amountDue: money(b.depositAmount),
    paymentChoice: b.paymentChoice,
    depositPaidAt: iso(b.depositPaidAt),
    balancePaidAt: iso(b.balancePaidAt),
    receipts: receiptsOf(b),
    payment,
    customerName: b.customerName,
    eventAddress: b.eventAddress,
    declineReason: b.declineReason,
    holdExpiresAt: iso(b.holdExpiresAt),
    createdAt: b.createdAt.toISOString(),
    canCancel: canCustomerCancel(b, cutoffDays),
    cancelDeadline: cancelDeadlineOf(b, cutoffDays),
  };
}

export function toBookingMine(
  b: BookingRow,
  cutoffDays: number,
  payment: CateringPaymentDetails,
): CateringBookingMine {
  return {
    ...toBookingPublic(b, cutoffDays, payment),
    accessToken: b.accessToken,
    customerPhone: b.customerPhone,
  };
}

export function toBookingAdmin(b: BookingRow): CateringBookingAdmin {
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    eventDate: fromDateOnly(b.eventDate),
    serviceTime: b.serviceTime,
    packageId: b.packageId,
    packageName: b.packageName,
    guests: b.guests,
    occasion: b.occasion,
    paymentChoice: b.paymentChoice,
    receipts: receiptsOf(b),
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    customerEmail: b.customerEmail,
    eventAddress: b.eventAddress,
    dietaryNotes: b.dietaryNotes,
    notes: b.notes,
    quoteAmount: money(b.quoteAmount),
    depositAmount: money(b.depositAmount),
    depositPaidAt: iso(b.depositPaidAt),
    balancePaidAt: iso(b.balancePaidAt),
    adminNotes: b.adminNotes,
    declineReason: b.declineReason,
    holdExpiresAt: iso(b.holdExpiresAt),
    decidedAt: iso(b.decidedAt),
    cancelledAt: iso(b.cancelledAt),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export function toGalleryPublic(g: CateringGalleryImage): CateringGalleryImagePublic {
  return { id: g.id, imageUrl: g.imageUrl, caption: g.caption };
}

export function toGalleryAdmin(g: CateringGalleryImage) {
  return {
    ...toGalleryPublic(g),
    isActive: g.isActive,
    sortOrder: g.sortOrder,
    createdAt: g.createdAt.toISOString(),
  };
}

export function toTestimonialPublic(t: CateringTestimonial): CateringTestimonialPublic {
  return { id: t.id, quote: t.quote, name: t.name, role: t.role };
}

export function toTestimonialAdmin(t: CateringTestimonial) {
  return {
    ...toTestimonialPublic(t),
    isActive: t.isActive,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
  };
}
