import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PosOrderStatus, PosPaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PosRealtimeGateway } from '../pos-realtime/pos-realtime.gateway';
import { CreatePosOrderDto, PosOrderItemDto } from './dto/create-pos-order.dto';
import { UpdatePosPaymentDto } from './dto/update-pos-payment.dto';
import {
  issuePosReceiptToken,
  verifyPosReceiptToken,
} from './pos-receipt-token.util';

function inferReceiptDiscountPercent(
  subtotal: number,
  discountAmount: number,
): number {
  const pct = (discountAmount / subtotal) * 100;
  if (Math.abs(pct - 5) < 0.51) return 5;
  if (Math.abs(pct - 10) < 0.51) return 10;
  return Math.round(pct * 100) / 100;
}

const orderInclude = {
  orderItems: {
    include: {
      product: true,
      variant: true,
    },
  },
  createdBy: { select: { id: true, email: true, displayName: true } },
  paidBy: { select: { id: true, email: true, displayName: true } },
} satisfies Prisma.PosOrderInclude;

const productInclude = {
  combo: {
    include: {
      slots: { include: { options: true } },
    },
  },
  variants: true,
} satisfies Prisma.PosProductInclude;

@Injectable()
export class PosOrdersService {
  constructor(
    private prisma: PrismaService,
    private gateway: PosRealtimeGateway,
  ) {}

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const prefix = `WG-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await this.prisma.posOrder.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    });
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  async create(dto: CreatePosOrderDto, adminId?: string) {
    let subtotal = new Prisma.Decimal(0);

    const resolvedItems: Array<{
      lineType: 'COMBO' | 'VARIANT' | 'SIMPLE';
      productId: string;
      variantId: string | null;
      displayName: string;
      choicesSummary: string | null;
      choicesJson: Prisma.InputJsonValue | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      remarks: string | null;
    }> = [];

    for (const item of dto.items) {
      const resolved = await this.resolveOrderLine(item);
      subtotal = subtotal.add(resolved.unitPrice.mul(item.quantity));
      resolvedItems.push({
        ...resolved,
        quantity: item.quantity,
        remarks: item.remarks?.trim() || null,
      });
    }

    const orderNumber = await this.generateOrderNumber();

    const discountPct =
      dto.discountPercent != null && [0, 5, 10].includes(dto.discountPercent)
        ? dto.discountPercent
        : 0;
    const discountMultiplier = 1 - discountPct / 100;
    const total = subtotal.mul(discountMultiplier).toDecimalPlaces(2);

    const order = await this.prisma.posOrder.create({
      data: {
        orderNumber,
        customerName: dto.customerName.trim(),
        serviceType: dto.serviceType,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PosPaymentStatus.UNPAID,
        status: PosOrderStatus.PLACED,
        subtotal,
        total,
        notes: dto.notes?.trim() || null,
        createdByAdminId: adminId ?? null,
        orderItems: {
          create: resolvedItems.map((ri) => ({
            lineType: ri.lineType,
            productId: ri.productId,
            variantId: ri.variantId,
            displayName: ri.displayName,
            choicesSummary: ri.choicesSummary,
            choicesJson: ri.choicesJson ?? Prisma.JsonNull,
            quantity: ri.quantity,
            unitPrice: ri.unitPrice,
            remarks: ri.remarks,
          })),
        },
      },
      include: orderInclude,
    });

    const mapped = this.mapOrder(order);
    this.gateway.broadcastOrderCreated(mapped);

    const tipRm =
      dto.tipAmount != null && Number.isFinite(Number(dto.tipAmount))
        ? Number(dto.tipAmount)
        : 0;
    const safeTip = tipRm > 0 ? Math.round(tipRm * 100) / 100 : 0;

    return {
      ...mapped,
      receiptToken: issuePosReceiptToken(order.id, safeTip),
    };
  }

  private async resolveOrderLine(item: PosOrderItemDto) {
    const product = await this.prisma.posProduct.findUnique({
      where: { id: item.productId },
      include: productInclude,
    });

    if (!product) {
      throw new BadRequestException(`Product ${item.productId} not found`);
    }
    if (!product.available) {
      throw new BadRequestException(`"${product.name}" is not available`);
    }

    if (item.lineType === 'SIMPLE') {
      if (product.type !== 'SIMPLE') {
        throw new BadRequestException(`"${product.name}" is not a simple product`);
      }
      return {
        lineType: 'SIMPLE' as const,
        productId: product.id,
        variantId: null,
        displayName: product.name,
        choicesSummary: null,
        choicesJson: null,
        unitPrice: new Prisma.Decimal(product.basePrice),
      };
    }

    if (item.lineType === 'VARIANT') {
      if (product.type !== 'VARIANT') {
        throw new BadRequestException(`"${product.name}" is not a variant product`);
      }
      if (!item.variantId) {
        throw new BadRequestException(`Variant required for "${product.name}"`);
      }
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new BadRequestException(`Variant not found for "${product.name}"`);
      }
      return {
        lineType: 'VARIANT' as const,
        productId: product.id,
        variantId: variant.id,
        displayName: `${product.name} (${variant.name})`,
        choicesSummary: variant.name,
        choicesJson: { variantId: variant.id, variantName: variant.name },
        unitPrice: new Prisma.Decimal(variant.price),
      };
    }

    if (item.lineType === 'COMBO') {
      if (product.type !== 'COMBO' || !product.combo) {
        throw new BadRequestException(`"${product.name}" is not a combo`);
      }
      const selections = item.comboSelections ?? [];
      const slots = product.combo.slots;
      const requiredSlots = slots.filter((s) => s.required);

      for (const slot of requiredSlots) {
        const pick = selections.find((s) => s.slotId === slot.id);
        if (!pick) {
          throw new BadRequestException(`Missing selection for "${slot.label}"`);
        }
      }

      let unitPrice = new Prisma.Decimal(product.basePrice);
      const choiceParts: string[] = [];
      const choicesJson: Array<{
        slotId: string;
        slotLabel: string;
        optionId: string;
        optionLabel: string;
        priceDelta: number;
      }> = [];

      for (const slot of slots.sort((a, b) => a.sortOrder - b.sortOrder)) {
        const pick = selections.find((s) => s.slotId === slot.id);
        if (!pick) continue;
        const option = slot.options.find((o) => o.id === pick.optionId);
        if (!option) {
          throw new BadRequestException(
            `Invalid option for slot "${slot.label}"`,
          );
        }
        unitPrice = unitPrice.add(option.priceDelta);
        const delta = Number(option.priceDelta);
        choiceParts.push(
          delta > 0 ? `${option.label} (+RM${delta})` : option.label,
        );
        choicesJson.push({
          slotId: slot.id,
          slotLabel: slot.label,
          optionId: option.id,
          optionLabel: option.label,
          priceDelta: delta,
        });
      }

      return {
        lineType: 'COMBO' as const,
        productId: product.id,
        variantId: null,
        displayName: product.name,
        choicesSummary: choiceParts.join(' · '),
        choicesJson,
        unitPrice,
      };
    }

    throw new BadRequestException(`Unknown line type for "${product.name}"`);
  }

  async findPublicReceiptByToken(token: string) {
    const { oid, tip } = verifyPosReceiptToken(token);

    const order = await this.prisma.posOrder.findUnique({
      where: { id: oid },
      include: { orderItems: true },
    });

    if (!order) {
      throw new NotFoundException('Receipt not found');
    }

    const subtotal = Number(order.subtotal);
    const orderTotal = Number(order.total);
    const tipAmount = tip;
    const discountAmount = Math.max(
      0,
      Math.round((subtotal - orderTotal) * 100) / 100,
    );
    const discountPercent =
      discountAmount > 0 && subtotal > 0
        ? inferReceiptDiscountPercent(subtotal, discountAmount)
        : null;
    const total = Math.round((orderTotal + tipAmount) * 100) / 100;

    return {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      serviceType: order.serviceType,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal,
      discountAmount,
      discountPercent,
      tip: tipAmount,
      total,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      items: order.orderItems.map((oi) => ({
        name: oi.displayName,
        choicesSummary: oi.choicesSummary,
        quantity: oi.quantity,
        unitPrice: Number(oi.unitPrice),
        lineTotal: Number(oi.unitPrice) * oi.quantity,
        remarks: oi.remarks,
      })),
    };
  }

  async findAll(filters?: { status?: PosOrderStatus; date?: string }) {
    const where: Prisma.PosOrderWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.date) {
      const d = new Date(filters.date);
      where.createdAt = {
        gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      };
    }

    const orders = await this.prisma.posOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
    });

    return orders.map(this.mapOrder);
  }

  async findOne(id: string) {
    const order = await this.prisma.posOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('POS order not found');
    return this.mapOrder(order);
  }

  async advanceStatus(id: string, adminId?: string) {
    const order = await this.prisma.posOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('POS order not found');

    const transitions: Record<PosOrderStatus, PosOrderStatus | null> = {
      PLACED: PosOrderStatus.PREPARING,
      PREPARING: PosOrderStatus.READY,
      READY: PosOrderStatus.COMPLETED,
      COMPLETED: null,
      CANCELLED: null,
    };

    const next = transitions[order.status];
    if (!next) {
      throw new BadRequestException(
        `Order is already ${order.status} and cannot advance`,
      );
    }

    const now = new Date();
    const timestamps: Prisma.PosOrderUpdateInput = { status: next };
    if (next === PosOrderStatus.PREPARING) timestamps.startedAt = now;
    if (next === PosOrderStatus.READY) timestamps.readyAt = now;
    if (next === PosOrderStatus.COMPLETED) {
      timestamps.completedAt = now;
      if (adminId) timestamps.paidBy = { connect: { id: adminId } };
    }

    const updated = await this.prisma.posOrder.update({
      where: { id },
      data: timestamps,
      include: orderInclude,
    });

    this.gateway.broadcastOrderUpdated(this.mapOrder(updated));
    return this.mapOrder(updated);
  }

  async cancelOrder(id: string) {
    const order = await this.prisma.posOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('POS order not found');

    if (order.status === PosOrderStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed order');
    }

    const updated = await this.prisma.posOrder.update({
      where: { id },
      data: { status: PosOrderStatus.CANCELLED },
      include: orderInclude,
    });

    this.gateway.broadcastOrderUpdated(this.mapOrder(updated));
    return this.mapOrder(updated);
  }

  async updatePayment(id: string, dto: UpdatePosPaymentDto, adminId?: string) {
    const order = await this.prisma.posOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('POS order not found');

    const data: Prisma.PosOrderUpdateInput = {
      paymentStatus: dto.paymentStatus,
    };
    if (dto.paymentStatus === PosPaymentStatus.PAID) {
      data.paidAt = new Date();
      if (adminId) data.paidBy = { connect: { id: adminId } };
    }

    const updated = await this.prisma.posOrder.update({
      where: { id },
      data,
      include: orderInclude,
    });

    const mapped = this.mapOrder(updated);

    this.gateway.broadcastOrderUpdated(mapped);

    if (dto.paymentStatus !== PosPaymentStatus.PAID) {
      return mapped;
    }

    const totalDiff =
      Math.round((Number(updated.total) - Number(updated.subtotal)) * 100) /
      100;
    const tipSafe =
      Number.isFinite(totalDiff) && totalDiff > 0 && totalDiff <= 999_999.99
        ? totalDiff
        : 0;

    return {
      ...mapped,
      receiptToken: issuePosReceiptToken(id, tipSafe),
    };
  }

  private mapOrder(
    order: Prisma.PosOrderGetPayload<{ include: typeof orderInclude }>,
  ) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      serviceType: order.serviceType,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      notes: order.notes,
      createdBy: order.createdBy,
      paidBy: order.paidBy,
      paidAt: order.paidAt?.toISOString() ?? null,
      startedAt: order.startedAt?.toISOString() ?? null,
      readyAt: order.readyAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      items: order.orderItems.map((oi) => ({
        id: oi.id,
        lineType: oi.lineType,
        productId: oi.productId,
        variantId: oi.variantId,
        displayName: oi.displayName,
        choicesSummary: oi.choicesSummary,
        quantity: oi.quantity,
        unitPrice: Number(oi.unitPrice),
        lineTotal: Number(oi.unitPrice) * oi.quantity,
        remarks: oi.remarks,
      })),
    };
  }
}
