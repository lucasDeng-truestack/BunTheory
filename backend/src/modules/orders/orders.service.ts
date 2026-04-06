import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { OrderStatus, OrderBatchStatus, PaymentChoice } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { BatchesService } from '../batches/batches.service';

const menuForOrder = {
  optionGroups: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      options: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
} satisfies Prisma.MenuInclude;

type MenuForOrder = Prisma.MenuGetPayload<{ include: typeof menuForOrder }>;

const orderInclude = {
  batch: true,
  orderItems: {
    include: {
      menu: true,
    },
  },
} satisfies Prisma.OrderInclude;

export type StorefrontReason = 'OK' | 'DISABLED' | 'FULL' | 'NO_BATCH';

export type ActiveBatchInfo = {
  id: string;
  label: string | null;
  opensAt: string;
  closesAt: string;
  fulfillmentDate: string;
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private batches: BatchesService,
  ) {}

  async getTodayItemCount() {
    const ctx = await this.getStorefrontContext();
    return ctx.current;
  }

  /** Orders still needing attention (not completed / delivered). */
  async countNonDelivered(): Promise<{ count: number }> {
    const count = await this.prisma.order.count({
      where: { status: { not: OrderStatus.DELIVERED } },
    });
    return { count };
  }

  async getStorefrontContext(now = new Date()) {
    const settings = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!settings) {
      return {
        canOrder: false,
        reason: 'DISABLED' as StorefrontReason,
        current: 0,
        max: 0,
        minimumDeliveryAmount: null as number | null,
        activeBatch: null as ActiveBatchInfo | null,
      };
    }
    if (!settings.orderingEnabled) {
      return {
        canOrder: false,
        reason: 'DISABLED' as StorefrontReason,
        current: 0,
        max: 0,
        minimumDeliveryAmount: settings.minimumDeliveryAmount
          ? Number(settings.minimumDeliveryAmount)
          : null,
        activeBatch: null as ActiveBatchInfo | null,
      };
    }

    const active = await this.batches.findActiveAt(now);
    if (!active) {
      return {
        canOrder: false,
        reason: 'NO_BATCH' as StorefrontReason,
        current: 0,
        max: 0,
        minimumDeliveryAmount: settings.minimumDeliveryAmount
          ? Number(settings.minimumDeliveryAmount)
          : null,
        activeBatch: null,
      };
    }

    const current = await this.batches.getBatchItemCount(active.id);
    const max = active.maxItems;
    const canOrder = current < max;

    const activeBatch: ActiveBatchInfo = {
      id: active.id,
      label: active.label,
      opensAt: active.opensAt.toISOString(),
      closesAt: active.closesAt.toISOString(),
      fulfillmentDate: active.fulfillmentDate.toISOString().slice(0, 10),
    };

    return {
      canOrder,
      reason: (canOrder ? 'OK' : 'FULL') as StorefrontReason,
      current,
      max,
      minimumDeliveryAmount: settings.minimumDeliveryAmount
        ? Number(settings.minimumDeliveryAmount)
        : null,
      activeBatch,
    };
  }

  private buildLine(
    menu: MenuForOrder,
    item: OrderItemDto,
  ): {
    unitPrice: Prisma.Decimal;
    selectedOptions: Prisma.InputJsonValue;
    menuId: string;
  } {
    if (!menu.available) {
      throw new BadRequestException(`"${menu.name}" is not available.`);
    }

    const byGroup = new Map<string, string[]>();
    for (const s of item.selections ?? []) {
      const prev = byGroup.get(s.groupId) ?? [];
      byGroup.set(s.groupId, [...prev, ...s.optionIds]);
    }

    const groupMap = new Map(menu.optionGroups.map((g) => [g.id, g]));
    const summary: string[] = [];
    const detail: Array<{
      groupName: string;
      optionId: string;
      label: string;
      priceDelta: number;
    }> = [];

    let delta = new Prisma.Decimal(0);

    for (const g of menu.optionGroups) {
      const picked = (byGroup.get(g.id) ?? []).filter(Boolean);
      const uniq = [...new Set(picked)];

      if (g.required && uniq.length === 0) {
        throw new BadRequestException(`Please select: ${g.name}`);
      }
      if (!g.required && uniq.length === 0) {
        continue;
      }
      if (!g.multiSelect && uniq.length > 1) {
        throw new BadRequestException(`Choose only one option for: ${g.name}`);
      }

      const optById = new Map(g.options.map((o) => [o.id, o]));
      for (const oid of uniq) {
        const opt = optById.get(oid);
        if (!opt) {
          throw new BadRequestException(`Invalid option for ${g.name}`);
        }
        delta = delta.add(opt.priceDelta);
        summary.push(`${g.name}: ${opt.label}`);
        detail.push({
          groupName: g.name,
          optionId: opt.id,
          label: opt.label,
          priceDelta: Number(opt.priceDelta),
        });
      }
    }

    for (const gid of byGroup.keys()) {
      if (!groupMap.has(gid)) {
        throw new BadRequestException('Invalid option selection');
      }
    }

    const unitPrice = new Prisma.Decimal(menu.price).add(delta);
    const selectedOptions: Prisma.InputJsonValue = {
      summary,
      detail,
    };

    return { unitPrice, selectedOptions, menuId: menu.id };
  }

  async create(dto: CreateOrderDto) {
    const settingsRow = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
    });
    if (settingsRow && !settingsRow.orderingEnabled) {
      throw new BadRequestException('Ordering is temporarily disabled.');
    }

    const newOrderItemCount = dto.items.reduce((sum, i) => sum + i.quantity, 0);

    const resolved: Array<{
      menuId: string;
      quantity: number;
      remarks: string | null;
      unitPrice: Prisma.Decimal;
      selectedOptions: Prisma.InputJsonValue;
    }> = [];

    let subtotal = new Prisma.Decimal(0);

    for (const item of dto.items) {
      let menu: MenuForOrder | null = null;
      if (item.slug) {
        menu = await this.prisma.menu.findFirst({
          where: { slug: item.slug },
          include: menuForOrder,
        });
      } else if (item.menuId) {
        menu = await this.prisma.menu.findUnique({
          where: { id: item.menuId },
          include: menuForOrder,
        });
      }
      if (!menu) {
        throw new BadRequestException(
          item.slug
            ? `Menu item "${item.slug}" was not found.`
            : 'Menu item was not found.',
        );
      }

      const soldAgg = await this.prisma.orderItem.aggregate({
        _sum: { quantity: true },
        where: { menuId: menu.id },
      });
      const sold = soldAgg._sum.quantity ?? 0;
      if (menu.maxQuantity != null && sold + item.quantity > menu.maxQuantity) {
        throw new BadRequestException(`"${menu.name}" is sold out.`);
      }

      const line = this.buildLine(menu, item);
      subtotal = subtotal.add(line.unitPrice.mul(item.quantity));

      resolved.push({
        menuId: line.menuId,
        quantity: item.quantity,
        remarks: item.remarks?.trim() ? item.remarks.trim() : null,
        unitPrice: line.unitPrice,
        selectedOptions: line.selectedOptions,
      });
    }

    const minDel = settingsRow?.minimumDeliveryAmount;
    if (
      dto.type === 'DELIVERY' &&
      minDel != null &&
      subtotal.lt(minDel)
    ) {
      throw new BadRequestException(
        `Minimum order of RM${Number(minDel).toFixed(2)} required for delivery.`,
      );
    }

    const paymentChoice: PaymentChoice =
      dto.paymentChoice === 'PAY_NOW' ? 'PAY_NOW' : 'PAY_LATER';
    let paymentReceiptUrl: string | null = null;

    if (paymentChoice === 'PAY_NOW') {
      paymentReceiptUrl = dto.receiptUrl?.trim() || null;
    } else if (dto.receiptUrl?.trim()) {
      throw new BadRequestException(
        'Receipt upload is only used when you choose Pay now.',
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `BT-${dateStr}-`;

    const created = await this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const batch = await tx.orderBatch.findFirst({
          where: {
            status: OrderBatchStatus.PUBLISHED,
            opensAt: { lte: now },
            closesAt: { gt: now },
          },
          orderBy: { opensAt: 'asc' },
        });
        if (!batch) {
          throw new BadRequestException(
            'No order session is open right now. Check back when the next window starts.',
          );
        }

        const agg = await tx.orderItem.aggregate({
          _sum: { quantity: true },
          where: { order: { batchId: batch.id } },
        });
        const current = agg._sum.quantity ?? 0;
        if (current + newOrderItemCount > batch.maxItems) {
          throw new BadRequestException(
            `This session is full (${current}/${batch.maxItems} items). Your order would add ${newOrderItemCount} more.`,
          );
        }

        const latestRows = await tx.$queryRaw<{ slugId: string }[]>`
          SELECT "slugId" FROM "Order"
          WHERE "slugId" LIKE ${prefix + '%'}
          ORDER BY "slugId" DESC
          LIMIT 1
          FOR UPDATE
        `;
        const lastSlugId = latestRows[0]?.slugId;
        const lastNum = lastSlugId
          ? parseInt(lastSlugId.replace(prefix, ''), 10)
          : 0;
        const nextNum = lastNum + 1;
        const slugId = `${prefix}${String(nextNum).padStart(3, '0')}`;

        return tx.order.create({
          data: {
            slugId,
            customerName: dto.customerName,
            phone: dto.phone,
            type: dto.type,
            paymentChoice,
            paymentReceiptUrl,
            batch: { connect: { id: batch.id } },
            orderItems: {
              create: resolved.map((r) => ({
                quantity: r.quantity,
                remarks: r.remarks,
                unitPrice: r.unitPrice,
                selectedOptions: r.selectedOptions,
                menu: { connect: { id: r.menuId } },
              })),
            },
          },
          include: orderInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const order = await this.findOne(created.id);

    await this.notifications.notifyAdminNewOrder(order);
    await this.notifications.notifyCustomerOrderReceived(order);

    return order;
  }

  async findTrackableByPhone(phoneRaw: string) {
    const phone = phoneRaw.trim();
    if (!phone) {
      throw new BadRequestException('Phone is required');
    }
    const digitKey = phone.replace(/\D/g, '');
    if (digitKey.length < 8) {
      throw new BadRequestException('Phone number is too short');
    }
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const activeStatuses: OrderStatus[] = ['RECEIVED', 'PREPARING', 'READY'];

    const byExact = await this.prisma.order.findMany({
      where: {
        phone,
        status: { in: activeStatuses },
        createdAt: { gte: since },
      },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    if (byExact.length > 0) {
      return byExact;
    }

    const candidates = await this.prisma.order.findMany({
      where: {
        status: { in: activeStatuses },
        createdAt: { gte: since },
      },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return candidates.filter((o) => o.phone.replace(/\D/g, '') === digitKey);
  }

  async findAll(filters?: {
    date?: string;
    customer?: string;
    menuId?: string;
    batchId?: string;
    /** When true: only orders with Pay now + uploaded receipt (admin “Payments” view). */
    paymentOnly?: string;
  }) {
    const where: Prisma.OrderWhereInput = {};

    if (filters?.batchId?.trim()) {
      where.batchId = filters.batchId.trim();
    }

    const paymentOnly =
      filters?.paymentOnly === 'true' || filters?.paymentOnly === '1';
    if (paymentOnly) {
      where.paymentChoice = 'PAY_NOW';
      where.paymentReceiptUrl = { not: null };
    }

    if (filters?.date) {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      switch (filters.date) {
        case 'today':
          where.createdAt = { gte: startOfDay };
          break;
        case 'week': {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          where.createdAt = { gte: weekAgo };
          break;
        }
        case 'month': {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          where.createdAt = { gte: monthAgo };
          break;
        }
        case 'all':
        default:
          break;
      }
    }

    if (filters?.customer?.trim()) {
      const term = filters.customer.trim().toLowerCase();
      where.OR = [
        { customerName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
      ];
    }

    if (filters?.menuId?.trim()) {
      const mid = filters.menuId.trim();
      where.orderItems = {
        some: { menuId: mid },
      };
    }

    return this.prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: orderInclude,
    });

    switch (status) {
      case 'PREPARING':
        await this.notifications.notifyCustomerPreparing(order);
        break;
      case 'READY':
        await this.notifications.notifyCustomerReady(order);
        break;
      case 'DELIVERED':
        await this.notifications.notifyCustomerDelivered(order);
        break;
    }

    return order;
  }
}
