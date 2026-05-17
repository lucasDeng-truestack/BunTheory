import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PosOrderStatus, PosPaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PosRealtimeGateway } from '../pos-realtime/pos-realtime.gateway';
import { CreatePosOrderDto } from './dto/create-pos-order.dto';
import { UpdatePosPaymentDto } from './dto/update-pos-payment.dto';
import {
  issuePosReceiptToken,
  verifyPosReceiptToken,
} from './pos-receipt-token.util';

const orderInclude = {
  orderItems: {
    include: {
      menuItem: true,
    },
  },
  createdBy: { select: { id: true, email: true, displayName: true } },
  paidBy: { select: { id: true, email: true, displayName: true } },
} satisfies Prisma.PosOrderInclude;

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
      menuItemId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      remarks: string | null;
    }> = [];

    for (const item of dto.items) {
      const menuItem = await this.prisma.posMenuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem) {
        throw new BadRequestException(`Menu item ${item.menuItemId} not found`);
      }
      if (!menuItem.available) {
        throw new BadRequestException(`"${menuItem.name}" is not available`);
      }

      const unitPrice = new Prisma.Decimal(menuItem.price);
      subtotal = subtotal.add(unitPrice.mul(item.quantity));
      resolvedItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        remarks: item.remarks?.trim() || null,
      });
    }

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.posOrder.create({
      data: {
        orderNumber,
        customerName: dto.customerName.trim(),
        serviceType: dto.serviceType,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PosPaymentStatus.UNPAID,
        status: PosOrderStatus.PLACED,
        subtotal,
        total: subtotal,
        notes: dto.notes?.trim() || null,
        createdByAdminId: adminId ?? null,
        orderItems: {
          create: resolvedItems.map((ri) => ({
            menuItemId: ri.menuItemId,
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
    const safeTip =
      tipRm > 0 ? Math.round(tipRm * 100) / 100 : 0;

    return {
      ...mapped,
      receiptToken: issuePosReceiptToken(order.id, safeTip),
    };
  }

  async findPublicReceiptByToken(token: string) {
    const { oid, tip } = verifyPosReceiptToken(token);

    const order = await this.prisma.posOrder.findUnique({
      where: { id: oid },
      include: {
        orderItems: {
          include: {
            menuItem: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Receipt not found');
    }

    const subtotal = Number(order.subtotal);
    const tipAmount = tip;
    const total = Math.round((subtotal + tipAmount) * 100) / 100;

    return {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      serviceType: order.serviceType,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal,
      tip: tipAmount,
      total,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      items: order.orderItems.map((oi) => ({
        name: oi.menuItem.name,
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

    if (next === PosOrderStatus.COMPLETED) {
      await this.deductInventoryStock(id);
    }

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

    const tipEmbedded =
      Math.round((Number(updated.total) - Number(updated.subtotal)) * 100) /
      100;
    const tipSafe =
      Number.isFinite(tipEmbedded) &&
      tipEmbedded >= 0 &&
      tipEmbedded <= 999_999.99
        ? tipEmbedded
        : 0;

    return {
      ...mapped,
      receiptToken: issuePosReceiptToken(id, tipSafe),
    };
  }

  private async deductInventoryStock(orderId: string) {
    const order = await this.prisma.posOrder.findUnique({
      where: { id: orderId },
      include: { orderItems: { include: { menuItem: { include: { recipeIngredients: true } } } } },
    });
    if (!order) return;

    for (const item of order.orderItems) {
      for (const ingredient of item.menuItem.recipeIngredients) {
        const totalDeduction = ingredient.quantityUsed.mul(item.quantity).negated();
        await this.prisma.inventoryStockMovement.create({
          data: {
            itemId: ingredient.inventoryItemId,
            type: 'SALE_USAGE',
            quantityChange: totalDeduction,
            referenceOrderId: orderId,
          },
        });
      }
    }
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
        menuItemId: oi.menuItemId,
        menuItemName: oi.menuItem.name,
        menuItemDescription: oi.menuItem.description,
        menuItemImage: oi.menuItem.image,
        quantity: oi.quantity,
        unitPrice: Number(oi.unitPrice),
        lineTotal: Number(oi.unitPrice) * oi.quantity,
        remarks: oi.remarks,
      })),
    };
  }
}
