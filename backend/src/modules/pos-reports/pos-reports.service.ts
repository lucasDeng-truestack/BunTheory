import { Injectable } from '@nestjs/common';
import { PosOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PosReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailySummary(date?: string) {
    const target = date ? new Date(date) : new Date();
    const startOfDay = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
    );
    const endOfDay = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate() + 1,
    );

    const where = {
      createdAt: { gte: startOfDay, lt: endOfDay },
      status: PosOrderStatus.COMPLETED,
    };

    const [orders, cashAgg, qrAgg, eatHereCount, takeawayCount, itemGroups] =
      await Promise.all([
        this.prisma.posOrder.count({ where }),
        this.prisma.posOrder.aggregate({
          where: { ...where, paymentMethod: 'CASH' },
          _sum: { total: true },
        }),
        this.prisma.posOrder.aggregate({
          where: { ...where, paymentMethod: 'QR' },
          _sum: { total: true },
        }),
        this.prisma.posOrder.count({
          where: { ...where, serviceType: 'EAT_HERE' },
        }),
        this.prisma.posOrder.count({
          where: { ...where, serviceType: 'TAKEAWAY' },
        }),
        this.prisma.posOrderItem.groupBy({
          by: ['productId', 'displayName'],
          where: { order: { ...where } },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10,
        }),
      ]);

    const totalRevenue =
      Number(cashAgg._sum.total ?? 0) + Number(qrAgg._sum.total ?? 0);

    return {
      date: startOfDay.toISOString().slice(0, 10),
      totalOrders: orders,
      totalRevenue,
      cashRevenue: Number(cashAgg._sum.total ?? 0),
      qrRevenue: Number(qrAgg._sum.total ?? 0),
      eatHereOrders: eatHereCount,
      takeawayOrders: takeawayCount,
      topItems: itemGroups.map((g) => ({
        productId: g.productId,
        name: g.displayName,
        quantitySold: g._sum.quantity ?? 0,
      })),
    };
  }

  async getDashboardSummary() {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    const todayCompleted = {
      createdAt: { gte: startOfDay, lt: endOfDay },
      status: PosOrderStatus.COMPLETED,
    };

    const [
      placedCount,
      preparingCount,
      readyCount,
      completedCount,
      revenueAgg,
      cashAgg,
      qrAgg,
      recentOrders,
      topItemGroups,
    ] = await Promise.all([
      this.prisma.posOrder.count({ where: { status: PosOrderStatus.PLACED } }),
      this.prisma.posOrder.count({
        where: { status: PosOrderStatus.PREPARING },
      }),
      this.prisma.posOrder.count({ where: { status: PosOrderStatus.READY } }),
      this.prisma.posOrder.count({ where: todayCompleted }),
      this.prisma.posOrder.aggregate({
        where: todayCompleted,
        _sum: { total: true },
      }),
      this.prisma.posOrder.aggregate({
        where: { ...todayCompleted, paymentMethod: 'CASH' },
        _sum: { total: true },
      }),
      this.prisma.posOrder.aggregate({
        where: { ...todayCompleted, paymentMethod: 'QR' },
        _sum: { total: true },
      }),
      this.prisma.posOrder.findMany({
        where: { createdAt: { gte: startOfDay, lt: endOfDay } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          orderItems: {
            select: {
              quantity: true,
              displayName: true,
              choicesSummary: true,
            },
          },
        },
      }),
      this.prisma.posOrderItem.groupBy({
        by: ['productId', 'displayName'],
        where: { order: todayCompleted },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      pipeline: { placed: placedCount, preparing: preparingCount, ready: readyCount },
      today: {
        completedOrders: completedCount,
        totalRevenue: Number(revenueAgg._sum.total ?? 0),
        cashRevenue: Number(cashAgg._sum.total ?? 0),
        qrRevenue: Number(qrAgg._sum.total ?? 0),
      },
      topItems: topItemGroups.map((g) => ({
        productId: g.productId,
        name: g.displayName,
        quantitySold: g._sum.quantity ?? 0,
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        status: o.status,
        serviceType: o.serviceType,
        paymentMethod: o.paymentMethod,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
        itemsSummary: o.orderItems
          .map((oi) => {
            const label = oi.choicesSummary
              ? `${oi.displayName} (${oi.choicesSummary})`
              : oi.displayName;
            return `${oi.quantity}x ${label}`;
          })
          .join(', '),
      })),
    };
  }
}
