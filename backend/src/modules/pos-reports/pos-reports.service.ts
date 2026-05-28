import { Injectable } from '@nestjs/common';
import { PosOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  createdAtFilter,
  last7DayBuckets,
  parseReportRange,
  PosReportRange,
  reportRangeBounds,
} from './pos-report-range.util';

@Injectable()
export class PosReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailySummary(date?: string) {
    if (date) {
      const target = new Date(date);
      const startOfDay = new Date(
        target.getFullYear(),
        target.getMonth(),
        target.getDate(),
      );
      return this.buildPeriodSummary({
        gte: startOfDay,
        lt: new Date(
          target.getFullYear(),
          target.getMonth(),
          target.getDate() + 1,
        ),
        range: 'today',
        periodStart: startOfDay.toISOString().slice(0, 10),
      });
    }
    return this.getPeriodSummary('today');
  }

  async getPeriodSummary(rangeInput?: string) {
    const range = parseReportRange(rangeInput);
    const bounds = reportRangeBounds(range);
    return this.buildPeriodSummary({
      gte: bounds.gte,
      lt: bounds.lt,
      range,
      periodStart: bounds.gte?.toISOString().slice(0, 10) ?? 'all',
    });
  }

  private async buildPeriodSummary(opts: {
    gte?: Date;
    lt: Date;
    range: PosReportRange;
    periodStart: string;
  }) {
    const createdAt: Prisma.DateTimeFilter = { lt: opts.lt };
    if (opts.gte) createdAt.gte = opts.gte;

    const where = {
      createdAt,
      status: PosOrderStatus.COMPLETED,
    };

    const [orders, cashAgg, qrAgg, itemGroups] = await Promise.all([
        this.prisma.posOrder.count({ where }),
        this.prisma.posOrder.aggregate({
          where: { ...where, paymentMethod: 'CASH' },
          _sum: { total: true },
        }),
        this.prisma.posOrder.aggregate({
          where: { ...where, paymentMethod: 'QR' },
          _sum: { total: true },
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
      range: opts.range,
      date: opts.periodStart,
      totalOrders: orders,
      totalRevenue,
      cashRevenue: Number(cashAgg._sum.total ?? 0),
      qrRevenue: Number(qrAgg._sum.total ?? 0),
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

    const sevenDayFilter = createdAtFilter('7d', now);
    const sevenDayWhere: Prisma.PosOrderWhereInput = {
      createdAt: sevenDayFilter,
    };

    const buckets = last7DayBuckets(now);

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
      completedLast7d,
      inProgressLast7d,
      cancelledLast7d,
      orderItemsWithProduct,
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
      this.prisma.posOrder.count({
        where: {
          ...sevenDayWhere,
          status: PosOrderStatus.COMPLETED,
        },
      }),
      this.prisma.posOrder.count({
        where: {
          ...sevenDayWhere,
          status: {
            in: [
              PosOrderStatus.PLACED,
              PosOrderStatus.PREPARING,
              PosOrderStatus.READY,
            ],
          },
        },
      }),
      this.prisma.posOrder.count({
        where: {
          ...sevenDayWhere,
          status: PosOrderStatus.CANCELLED,
        },
      }),
      this.prisma.posOrderItem.findMany({
        where: {
          order: {
            ...sevenDayWhere,
            status: PosOrderStatus.COMPLETED,
          },
          productId: { not: null },
        },
        select: {
          quantity: true,
          unitPrice: true,
          orderId: true,
          product: {
            select: {
              section: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const revenueTrend = await Promise.all(
      buckets.map(async (bucket) => {
        const dayWhere = {
          createdAt: { gte: bucket.start, lt: bucket.end },
          status: PosOrderStatus.COMPLETED,
        };
        const [count, agg] = await Promise.all([
          this.prisma.posOrder.count({ where: dayWhere }),
          this.prisma.posOrder.aggregate({
            where: dayWhere,
            _sum: { total: true },
          }),
        ]);
        return {
          date: bucket.date,
          revenue: Number(agg._sum.total ?? 0),
          orders: count,
        };
      }),
    );

    const pipelineTotal = placedCount + preparingCount + readyCount;
    const kitchenLoad = {
      placedPct:
        pipelineTotal > 0
          ? Math.round((placedCount / pipelineTotal) * 1000) / 10
          : 0,
      preparingPct:
        pipelineTotal > 0
          ? Math.round((preparingCount / pipelineTotal) * 1000) / 10
          : 0,
      readyPct:
        pipelineTotal > 0
          ? Math.round((readyCount / pipelineTotal) * 1000) / 10
          : 0,
    };

    const sectionMap = new Map<
      string,
      { sectionName: string; orders: Set<string>; quantity: number; revenue: number }
    >();

    for (const item of orderItemsWithProduct) {
      const sectionName = item.product?.section?.name ?? 'Other';
      const existing = sectionMap.get(sectionName) ?? {
        sectionName,
        orders: new Set<string>(),
        quantity: 0,
        revenue: 0,
      };
      existing.orders.add(item.orderId);
      existing.quantity += item.quantity;
      existing.revenue += Number(item.unitPrice) * item.quantity;
      sectionMap.set(sectionName, existing);
    }

    const salesBySection = [...sectionMap.values()]
      .map((s) => ({
        sectionName: s.sectionName,
        orders: s.orders.size,
        quantity: s.quantity,
        revenue: Math.round(s.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenueToday = Number(revenueAgg._sum.total ?? 0);
    const cashRevenueToday = Number(cashAgg._sum.total ?? 0);
    const qrRevenueToday = Number(qrAgg._sum.total ?? 0);

    return {
      pipeline: {
        placed: placedCount,
        preparing: preparingCount,
        ready: readyCount,
      },
      today: {
        completedOrders: completedCount,
        totalRevenue: totalRevenueToday,
        cashRevenue: cashRevenueToday,
        qrRevenue: qrRevenueToday,
        activeKitchenOrders: placedCount + preparingCount + readyCount,
        avgOrderValue:
          completedCount > 0
            ? Math.round((totalRevenueToday / completedCount) * 100) / 100
            : 0,
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
      revenueTrend,
      statusBreakdown: {
        inProgress: inProgressLast7d,
        completed: completedLast7d,
        cancelled: cancelledLast7d,
      },
      kitchenLoad,
      salesBySection,
    };
  }
}
