import {
  Prisma,
  ShopOrder,
  ShopOrderItem,
  ShopReceipt,
} from '@prisma/client';
import { fromDateOnly } from '../catering/catering.dates';
import { SHOP_PICKUP_AREA } from './shop.config';
import {
  ShopOrderAdmin,
  ShopOrderPublic,
  ShopReceiptView,
} from './shop.types';

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const money = (v: Prisma.Decimal): string => v.toFixed(2);

export type ShopOrderRow = ShopOrder & {
  items?: ShopOrderItem[];
  receipts?: ShopReceipt[];
};

const toReceipt = (r: ShopReceipt): ShopReceiptView => ({
  id: r.id,
  fileUrl: r.fileUrl,
  fileName: r.fileName,
  createdAt: r.createdAt.toISOString(),
});

export function toShopOrderPublic(o: ShopOrderRow): ShopOrderPublic {
  return {
    reference: o.reference,
    accessToken: o.accessToken,
    status: o.status,
    type: o.type,
    address:
      o.type === 'DELIVERY'
        ? {
            line1: o.addressLine1 ?? '',
            line2: o.addressLine2,
            city: o.city ?? '',
            state: o.state ?? '',
            postcode: o.postcode ?? '',
            country: 'Malaysia',
            notes: o.deliveryNotes,
          }
        : null,
    pickupArea: o.type === 'PICKUP' ? SHOP_PICKUP_AREA : null,
    fulfilmentDate: fromDateOnly(o.fulfilmentDate),
    timeSlot: o.timeSlot,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    items: [...(o.items ?? [])].map((i) => ({
      packageKey: i.packageKey,
      packageName: i.packageName,
      unitPrice: money(i.unitPrice),
      quantity: i.quantity,
    })),
    subtotal: money(o.subtotal),
    total: money(o.total),
    paymentChoice: o.paymentChoice,
    amountDue: money(o.amountDue),
    depositPaidAt: iso(o.depositPaidAt),
    fullyPaidAt: iso(o.fullyPaidAt),
    receipts: [...(o.receipts ?? [])]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toReceipt),
    createdAt: o.createdAt.toISOString(),
  };
}

export function toShopOrderAdmin(o: ShopOrderRow): ShopOrderAdmin {
  return {
    ...toShopOrderPublic(o),
    id: o.id,
    adminNotes: o.adminNotes,
    updatedAt: o.updatedAt.toISOString(),
  };
}
