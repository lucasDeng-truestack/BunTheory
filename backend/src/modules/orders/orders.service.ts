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

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Total number of items (burgers) sold today across all orders */
  async getTodayItemCount() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        order: { createdAt: { gte: startOfDay } },
      },
    });
    return result._sum.quantity ?? 0;
  }

  /** Number of orders placed today (for slugId sequence) */
  async getTodayOrderCount() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.prisma.order.count({
      where: { createdAt: { gte: startOfDay } },
    });
  }

  async getSettings() {
    let settings = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: { maxOrdersPerDay: 15, orderingEnabled: true },
      });
    }
    return settings;
  }

  async canPlaceOrder(): Promise<{ canOrder: boolean; current: number; max: number }> {
    const [itemCount, settings] = await Promise.all([
      this.getTodayItemCount(),
      this.getSettings(),
    ]);
    const max = settings.maxOrdersPerDay;
    const canOrder = settings.orderingEnabled && itemCount < max;
    return { canOrder, current: itemCount, max };
  }

  async create(dto: CreateOrderDto) {
    const order = await this.prisma.$transaction(
      async (tx) => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Lock SystemSettings row to serialize order creation and prevent race conditions
        const settingsRows = await tx.$queryRaw<
          { id: string; maxOrdersPerDay: number; orderingEnabled: boolean }[]
        >`SELECT id, "maxOrdersPerDay", "orderingEnabled" FROM "SystemSettings" ORDER BY id ASC LIMIT 1 FOR UPDATE`;
        let settings = settingsRows[0];
        if (!settings) {
          await tx.systemSettings.create({
            data: { maxOrdersPerDay: 15, orderingEnabled: true },
          });
          const [created] = await tx.$queryRaw<
            { id: string; maxOrdersPerDay: number; orderingEnabled: boolean }[]
          >`SELECT id, "maxOrdersPerDay", "orderingEnabled" FROM "SystemSettings" ORDER BY id ASC LIMIT 1 FOR UPDATE`;
          settings = created;
        }

        const maxItems = Number(settings.maxOrdersPerDay) || 15;
        const orderingEnabled = Boolean(settings.orderingEnabled);

        const newOrderItemCount = dto.items.reduce((sum, i) => sum + i.quantity, 0);
        if (newOrderItemCount > maxItems) {
          throw new BadRequestException(
            `Order exceeds daily capacity. You ordered ${newOrderItemCount} items but max is ${maxItems} per day.`,
          );
        }

        const currentItemCountResult = await tx.orderItem.aggregate({
          _sum: { quantity: true },
          where: { order: { createdAt: { gte: startOfDay } } },
        });
        const currentItemCount = currentItemCountResult._sum.quantity ?? 0;
        const totalAfterOrder = currentItemCount + newOrderItemCount;

        if (!orderingEnabled || totalAfterOrder > maxItems) {
          throw new BadRequestException(
            `Ordering is closed. Today's capacity reached (${currentItemCount}/${maxItems} items sold). ` +
              `Your order would add ${newOrderItemCount} more.`,
          );
        }

        // Serialize slugId generation: advisory lock per day + lock latest order (when exists)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const lockKey = parseInt(dateStr, 10);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
        const prefix = `BT-${dateStr}-`;
        const latestRows = await tx.$queryRaw<{ slugId: string }[]>`
          SELECT "slugId" FROM "Order"
          WHERE "slugId" LIKE ${prefix + '%'}
          ORDER BY "slugId" DESC
          LIMIT 1
          FOR UPDATE
        `;
        const lastSlugId = latestRows[0]?.slugId;
        const nextNum = lastSlugId
          ? parseInt(lastSlugId.replace(prefix, ''), 10) + 1
          : 1;
        const slugId = `${prefix}${String(nextNum).padStart(3, '0')}`;

        // Resolve menu lines: prefer slug (stable across DB re-seeds); menuId if no slug
        const resolvedItems: { menuId: string; quantity: number }[] = [];
        for (const item of dto.items) {
          let menuId: string;
          if (item.slug) {
            const menuBySlug = await tx.menu.findUnique({
              where: { slug: item.slug },
            });
            if (!menuBySlug) {
              throw new BadRequestException(
                `Menu item with slug "${item.slug}" not found`,
              );
            }
            menuId = menuBySlug.id;
          } else if (item.menuId) {
            menuId = item.menuId;
          } else {
            throw new BadRequestException(
              'Each order item must have menuId or slug',
            );
          }
          const menu = await tx.menu.findUnique({
            where: { id: menuId },
          });
          if (!menu) {
            throw new BadRequestException(`Menu item ${menuId} not found`);
          }
          if (!menu.available) {
            throw new BadRequestException(
              `Menu item "${menu.name}" is sold out`,
            );
          }
          resolvedItems.push({ menuId, quantity: item.quantity });
        }

        return tx.order.create({
          data: {
            slugId,
            customerName: dto.customerName,
            phone: dto.phone,
            type: dto.type,
            orderItems: {
              create: resolvedItems.map((i) => ({
                menuId: i.menuId,
                quantity: i.quantity,
              })),
            },
          },
          include: {
            orderItems: {
              include: { menu: true },
            },
          },
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

  async findAll(filters?: { date?: string; customer?: string; menuId?: string }) {
    const where: Prisma.OrderWhereInput = {};

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
      where.orderItems = {
        some: { menuId: filters.menuId.trim() },
      };
    }

    return this.prisma.order.findMany({
      where,
      include: {
        orderItems: { include: { menu: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: { include: { menu: true } },
      },
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
      include: {
        orderItems: { include: { menu: true } },
      },
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
