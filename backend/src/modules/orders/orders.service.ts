import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { BatchesService } from '../batches/batches.service';

const orderInclude = {
  orderItems: {
    include: {
      menu: true,
      menuSnapshotItem: true,
    },
  },
  batch: true,
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private batchesService: BatchesService,
  ) {}

  /** @deprecated Use batch context; kept for admin dashboard until migrated */
  async getTodayItemCount() {
    const ctx = await this.batchesService.getStorefrontContext();
    if (!ctx.batchId) return 0;
    return ctx.current;
  }

  async getStorefrontContext() {
    return this.batchesService.getStorefrontContext();
  }

  async create(dto: CreateOrderDto) {
    const resolved = await this.batchesService.resolveBatchForNewOrder();
    if (!resolved) {
      const ctx = await this.batchesService.getStorefrontContext();
      throw new BadRequestException(
        `Ordering is unavailable${ctx.reason ? ` (${ctx.reason})` : ''}.`,
      );
    }
    const { batch: initialBatch } = resolved;

    const order = await this.prisma.$transaction(
      async (tx) => {
        const settingsRow = await tx.systemSettings.findFirst();
        if (settingsRow && !settingsRow.orderingEnabled) {
          throw new BadRequestException('Ordering is temporarily disabled.');
        }

        await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "OrderBatch" WHERE id = ${initialBatch.id} FOR UPDATE
        `;

        const batch = await tx.orderBatch.findUniqueOrThrow({
          where: { id: initialBatch.id },
          include: {
            menuSnapshot: { include: { items: true } },
          },
        });
        if (!batch.menuSnapshot) {
          throw new BadRequestException('Batch has no published menu.');
        }
        const snapshot = batch.menuSnapshot;

        const newOrderItemCount = dto.items.reduce((sum, i) => sum + i.quantity, 0);
        const currentItemCountResult = await tx.orderItem.aggregate({
          _sum: { quantity: true },
          where: { order: { batchId: batch.id } },
        });
        const currentItemCount = currentItemCountResult._sum.quantity ?? 0;
        const totalAfterOrder = currentItemCount + newOrderItemCount;

        if (totalAfterOrder > batch.maxItems) {
          throw new BadRequestException(
            `This batch is full (${currentItemCount}/${batch.maxItems} items). Your order would add ${newOrderItemCount} more.`,
          );
        }

        const dateStr = batch.fulfillmentDate
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '');
        const prefix = `BT-${dateStr}-`;
        const latestRows = await tx.$queryRaw<{ slugId: string }[]>`
          SELECT "slugId" FROM "Order"
          WHERE "batchId" = ${batch.id}
          ORDER BY "slugId" DESC
          LIMIT 1
          FOR UPDATE
        `;
        const lastSlugId = latestRows[0]?.slugId;
        const nextNum = lastSlugId
          ? parseInt(lastSlugId.replace(prefix, ''), 10) + 1
          : 1;
        const slugId = `${prefix}${String(nextNum).padStart(3, '0')}`;

        const resolvedItems: { menuSnapshotItemId: string; quantity: number }[] =
          [];
        for (const item of dto.items) {
          let line: (typeof snapshot.items)[0] | undefined;
          if (item.slug) {
            line = snapshot.items.find((i) => i.slug === item.slug);
          } else if (item.menuId) {
            line = snapshot.items.find(
              (i) =>
                i.id === item.menuId || i.sourceMenuId === item.menuId,
            );
          }
          if (!line) {
            throw new BadRequestException(
              item.slug
                ? `Menu item "${item.slug}" is not available for this batch.`
                : `Menu item is not available for this batch.`,
            );
          }
          if (!line.available) {
            throw new BadRequestException(`"${line.name}" is sold out.`);
          }
          resolvedItems.push({
            menuSnapshotItemId: line.id,
            quantity: item.quantity,
          });
        }

        return tx.order.create({
          data: {
            slugId,
            batchId: batch.id,
            customerName: dto.customerName,
            phone: dto.phone,
            type: dto.type,
            orderItems: {
              create: resolvedItems.map((i) => ({
                menuSnapshotItemId: i.menuSnapshotItemId,
                quantity: i.quantity,
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
  }) {
    const where: Prisma.OrderWhereInput = {};

    if (filters?.batchId?.trim()) {
      where.batchId = filters.batchId.trim();
    }

    if (filters?.date) {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      switch (filters.date) {
        case 'today':
          where.createdAt = { gte: startOfDay };
          break;
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          where.createdAt = { gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          where.createdAt = { gte: monthAgo };
          break;
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
        some: {
          OR: [
            { menuId: mid },
            { menuSnapshotItem: { sourceMenuId: mid } },
          ],
        },
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
